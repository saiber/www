<?php $languageDefs = array (
  'TwoCheckout_help' => '<h2>Additional Setup Instructions</h2><ol><li>Login to your 2Checkout account</li><li>Go to <em>Account -> Site Management</em> section</li><li>Change <em>Direct Return</em> to <em><strong>Immediately returned to my website</strong></em></li><li>Change <em>Approved URL </em> to <em><strong>{link controller=checkout action=notify id=TwoCheckout url=true}</strong></em></li><li>Change <em>Pending URL </em> to <em><strong>{link controller=checkout action=completed url=true}</strong></em></li><li>Recommended: enter a <em>Secret Word</em> for extra security. The same word has to be entered in LiveCart options below</li></ul>',
  'TwoCheckout' => '2Checkout',
  'TwoCheckout_account' => 'Account ID',
  'TwoCheckout_currency' => 'Account currency',
  'TwoCheckout_secretWord' => 'Secret word <a href="https://www.2checkout.com/2co/admin/look_and_feel" target="_blank">(?)</a>',
  'TwoCheckout_test' => 'Test (demo) mode',
); ?>