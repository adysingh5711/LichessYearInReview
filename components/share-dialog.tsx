'use client'

import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog"
import { VisuallyHidden } from "./ui/visually-hidden"
import { toPng } from "html-to-image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stats: any // Replace with proper type
    totalGames: number
    peakRating: number
    username: string
}

interface StatBlockProps {
    title: string;
    children: React.ReactNode;
}

interface StatItemProps {
    label: string;
    value: string | number;
    truncate?: boolean;
}

function StatBlock({ title, children }: StatBlockProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--primary))]">{title}</h3>
            {children}
        </div>
    )
}

function StatItem({ label, value, truncate }: StatItemProps) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-xs font-medium", truncate && "truncate max-w-[140px]")}>
                {value}
            </span>
        </div>
    )
}

export function ShareDialog({ open, onOpenChange, stats, totalGames, peakRating, username }: ShareDialogProps) {
    const { theme } = useTheme()

    const filteredOpponents = stats.headToHead
        .filter((opponent: { games: number }) => opponent.games > 3)
        .sort((a: { games: number }, b: { games: number }) => b.games - a.games)

    const mostWinsOpponent = [...stats.headToHead]
        .sort((a: { wins: number }, b: { wins: number }) => b.wins - a.wins)[0]

    const handleDownload = async () => {
        const cardElement = document.getElementById('share-card')
        if (!cardElement) return

        const dataUrl = await toPng(cardElement, {
            backgroundColor: theme === 'dark' ? '#000000' : '#fdf4ff',
            pixelRatio: 2,
            cacheBust: true,
        })

        const link = document.createElement('a')
        link.download = 'chess-year-review.png'
        link.href = dataUrl
        link.click()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 border-0 overflow-visible bg-transparent">
                <VisuallyHidden>
                    <DialogTitle>Chess Year in Review Share Card</DialogTitle>
                </VisuallyHidden>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-lg" />
                <div className="relative flex items-center justify-center min-h-screen p-4">
                    <div
                        className="w-[360px] h-[640px] bg-background rounded-xl shadow-2xl p-6 border relative flex flex-col"
                        id="share-card"
                        style={{
                            background: theme === 'dark'
                                ? 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--secondary)/0.3))'
                                : 'linear-gradient(145deg, #fdf4ff 0%, #f5d0fe 100%)',
                        }}
                    >
                        {/* Title Section */}
                        <div className="space-y-1 mb-6">
                            <h2
                                className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                CHESS YEAR IN REVIEW
                            </h2>
                            <p className="text-sm text-purple-700">{username} • Summary</p>
                        </div>

                        {/* Overall Stats - Updated with 3 columns */}
                        <div className="grid grid-cols-3 gap-3 mb-2.5">
                            <div className="text-center p-2 rounded-lg bg-background/50 border">
                                <p className="text-xl font-bold text-purple-600">{totalGames}</p>
                                <p className="text-xs">Total Games</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-background/50 border">
                                <p className="text-xl font-bold text-purple-600">{peakRating}</p>
                                <p className="text-xs">Peak Rating</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-background/50 border">
                                <p className="text-xl font-bold text-purple-600">{stats.streaks.winStreak}</p>
                                <p className="text-xs">Best Streak</p>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="space-y-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-purple-600">Results</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <p className="text-lg font-bold text-green-500">{stats.results.wins}</p>
                                    <p className="text-[10px]">Wins</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-lg font-bold text-red-500">{stats.results.losses}</p>
                                    <p className="text-[10px]">Losses</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-lg font-bold text-blue-500">{stats.results.draws}</p>
                                    <p className="text-[10px]">Draws</p>
                                </div>
                            </div>
                        </div>

                        {/* Color Stats */}
                        <div className="space-y-1.5 mb-1.5">
                            <h3 className="text-sm font-semibold text-purple-600">Color Performance</h3>
                            <div className="p-2 rounded-lg bg-background/50 border">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-white">⚪ {stats.colorStats.White.wins} wins</span>
                                    <span className="text-xs text-zinc-900 dark:text-zinc-200">⚫ {stats.colorStats.Black.wins} wins</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 mb-1.5">
                            <h3 className="text-sm font-semibold text-purple-600">Openings</h3>
                            <div className="p-2 rounded-lg bg-background/50 border space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Most Played:</span>
                                    <span className="text-purple-600 font-small" style={{ fontSize: '1rem', textAlign: 'right' }}>
                                        {stats.openings[0]?.name || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Played:</span>
                                    <span className="text-purple-600 font-small">
                                        {stats.openings[0]?.count || 0} times
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Win Rate:</span>
                                    <span className="text-purple-600 font-small">
                                        {stats.openings[0]?.winRate.toFixed(1) || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 mb-1.5">
                            <h3 className="text-sm font-semibold text-purple-600">Opponents</h3>
                            <div className="p-2 rounded-lg bg-background/50 border space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Most Played:</span>
                                    <span className="text-purple-600 font-small truncate max-w-[180px]">
                                        {filteredOpponents[0]?.opponent || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Most Wins vs:</span>
                                    <span className="text-purple-600 font-small truncate max-w-[180px]">
                                        {mostWinsOpponent?.opponent || "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto text-center">
                            <p className="text-sm text-purple-700">Made with ❤️ by Opensource</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute bottom-8 right-4 flex gap-2">
                        <Button
                            onClick={handleDownload}
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
                        >
                            Download
                        </Button>
                        <Button
                            onClick={async () => {
                                const cardElement = document.getElementById('share-card')
                                if (!cardElement) return

                                try {
                                    const dataUrl = await toPng(cardElement, {
                                        backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                                        pixelRatio: 2,
                                        cacheBust: true,
                                    })

                                    const tweetText = `Check out my Chess Year in Review!\n\n🎮 Total Games: ${totalGames}\n🏆 Wins: ${stats.results.wins}\n⭐ Peak Rating: ${peakRating}\n\nAnalyze your games at ${window.location.origin}\n\n#ChessYearInReview #Lichess`
                                    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
                                    window.open(shareUrl, '_blank')
                                } catch (error) {
                                    console.error('Error sharing:', error)
                                }
                            }}
                            size="sm"
                            className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white text-xs"
                        >
                            Share on X
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 