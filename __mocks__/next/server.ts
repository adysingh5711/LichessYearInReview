export const NextResponse = {
    json: jest.fn((data, init) => ({
        ...init,
        json: () => Promise.resolve(data),
    })),
};