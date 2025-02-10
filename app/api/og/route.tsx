import { ImageResponse } from 'next/og';

export const config = {
    runtime: 'edge',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Lichess Review';
    const description = searchParams.get('description') || 'Analyze your chess games and track your progress!';

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to right, #6a11cb, #2575fc)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '1.5rem', color: 'lightgray' }}>{description}</p>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
