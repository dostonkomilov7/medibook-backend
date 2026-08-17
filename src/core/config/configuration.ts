export default () => ({
    jwt: {
        access_key: process.env.ACCESS_TOKEN_KEY,
        access_time:
            parseInt(process.env.ACCESS_TOKEN_EXPIRE as string, 10) || 600,
        refresh_key: process.env.REFRESH_TOKEN_KEY,
        refresh_time: process.env.REFRESH_TOKEN_EXPIRE,
    },
    signature: {
        signature_key: process.env.SIGNATURE_KEY
    },
    google: {
        client_id: process.env.GOOGLE_CLIENT_ID,
    }
});
