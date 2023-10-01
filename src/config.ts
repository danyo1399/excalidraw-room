import process from 'process';

function getConfigValue( key: string) {
    const str = process.env[key];
    if(str == null) {
        throw new Error(`config ${key} was undefined`)
    }
    return str;
}
export const config = {
    auth: {
        issuer: getConfigValue('AUTH__ISSUER'),
        authorizationURL: getConfigValue('AUTH__AUTHORIZATION_URL'),
        tokenURL: getConfigValue('AUTH__TOKEN_URL'),
        userInfoURL: getConfigValue('AUTH__USER_INFO_URL'),
        clientID: getConfigValue('AUTH__CLIENT_ID'),
        clientSecret: getConfigValue('AUTH__CLIENT_SECRET'),
        scopes: (getConfigValue('AUTH__SCOPES') || '').split(' ')
    },
    secretKey: getConfigValue('SECRET_KEY')
}

console.log('config', config);