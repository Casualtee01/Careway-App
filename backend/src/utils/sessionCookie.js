function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    signed: true,
    path: '/api/v1/auth'
  };
}

function setRefreshCookie(res, token) {
  const maxAge = process.env.REFRESH_TOKEN_EXPIRES_IN === '7d' ? 7 * 24 * 60 * 60 * 1000 : undefined;
  res.cookie('refreshToken', token, { ...cookieOptions(), maxAge });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', cookieOptions());
}

module.exports = { setRefreshCookie, clearRefreshCookie };