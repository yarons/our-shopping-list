module.exports = {
  VUE_APP_SINGLEBOARD_MODE: !!parseInt(process.env.VUE_APP_SINGLEBOARD_MODE),
  VUE_APP_SINGLEBOARD_SLUG: process.env.VUE_APP_SINGLEBOARD_SLUG || '_',
  VUE_APP_SINGLEBOARD_ID: process.env.VUE_APP_SINGLEBOARD_ID || '00000000-0000-0000-0000-000000000000'
}
