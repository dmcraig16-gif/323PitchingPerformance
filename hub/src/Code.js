/**
 * Web app entry point.
 * Deployed as: Execute as me, Access: only myself.
 */
function doGet() {
  assertOwner_();
  var out = HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('323 Hub')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  try { out.setFaviconUrl('https://323pitchingperformance.com/assets/favicon.png'); } catch (e) { /* optional */ }
  return out;
}

/** Used by templates: <?!= include_('Styles') ?> */
function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * Second lock on the door. The deployment already limits access to the owner;
 * this also stops any server call if that setting is ever changed by mistake.
 */
function assertOwner_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail(); } catch (e) { email = ''; }
  if (String(email).toLowerCase() !== CONFIG.OWNER_EMAIL.toLowerCase()) {
    throw new Error('Not authorized.');
  }
}
