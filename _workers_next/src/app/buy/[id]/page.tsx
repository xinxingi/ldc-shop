import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { BuyContent } from "@/components/buy-content"
import { getProduct, getProductReviews, getProductRating, canUserReview } from "@/lib/db/queries"
import { getEmailSettings } from "@/lib/email"
import { cacheLife, cacheTag } from "next/cache"

interface BuyPageProps {
    params: Promise<{ id: string }>
}

const TAG_PRODUCTS = "home:products"
const TAG_RATINGS = "home:ratings"

export default async function BuyPage({ params }: BuyPageProps) {
    const { id } = await params

    const getCachedProduct = async () => {
        'use cache'
        cacheTag(TAG_PRODUCTS)
        cacheLife('days')
        return getProduct(id)
    }

    const getCachedReviews = async () => {
        'use cache'
        cacheTag(TAG_RATINGS)
        cacheLife('days')
        return getProductReviews(id)
    }

    // Run all queries in parallel for better performance
    const [session, product, reviews, emailSettings] = await Promise.all([
        auth(),
        getCachedProduct().catch(() => null),
        getCachedReviews().catch(() => []),
        getEmailSettings().catch(() => ({ apiKey: null, fromEmail: null, enabled: false, fromName: null }))
    ])

    // Return 404 if product doesn't exist or is inactive
    if (!product) {
        notFound()
    }

    // Check review eligibility (depends on session, so run after)
    let userCanReview: { canReview: boolean; orderId?: string } = { canReview: false }
    if (session?.user?.id) {
        try {
            userCanReview = await canUserReview(session.user.id, id, session.user.username || undefined)
        } catch {
            // Ignore errors
        }
    }

    return (
        <BuyContent
            product={product}
            stockCount={product.stock || 0}
            lockedStockCount={product.locked || 0}
            isLoggedIn={!!session?.user}
            reviews={reviews}
            averageRating={Number(product.rating || 0)}
            reviewCount={Number(product.reviewCount || 0)}
            canReview={userCanReview.canReview}
            reviewOrderId={userCanReview.orderId}
            emailEnabled={!!(emailSettings?.enabled && emailSettings?.apiKey && emailSettings?.fromEmail)}
        />
    )
}
