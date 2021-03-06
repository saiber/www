<?php
$roles = array (
  'PaymentController' => 'order',
  'PaymentController::index' => 'order',
  'PaymentController::void' => 'order.update',
  'PaymentController::capture' => 'order.update',
  'PaymentController::deleteCcNumber' => 'order.update',
  'PaymentController::addOffline' => 'order.update',
  'PaymentController::totals' => 'order',
  'PaymentController::transaction' => 'order',
  'PaymentController::ccForm' => 'order',
  'PaymentController::processCreditCard' => 'order.update',
  'PaymentController::changeOrderPaidStatus' => 'order',
  'PaymentController::changeOfflinePaymentMethod' => 'order',
  'PaymentController::init' => 'order',
  'PaymentController::boxUserMenuBlock' => 'order',
  'PaymentController::translationsBlock' => 'order',
  'PaymentController::toolbarBlock' => 'order',
  'PaymentController::getBlockResponse' => 'order',
  'PaymentController::getGenericBlock' => 'order',
  'PaymentController::getRoles' => 'order',
  'PaymentController::getCacheHandler' => 'order',
  'PaymentController::translate' => 'order',
  'PaymentController::translateArray' => 'order',
  'PaymentController::makeText' => 'order',
  'PaymentController::getUser' => 'order',
  'PaymentController::setUser' => 'order',
  'PaymentController::loadLanguageFile' => 'order',
  'PaymentController::getApplication' => 'order',
  'PaymentController::getMessage' => 'order',
  'PaymentController::getErrorMessage' => 'order',
  'PaymentController::__get' => 'order',
  'PaymentController::recheckAccess' => 'order',
  'PaymentController::redirect301' => 'order',
  'PaymentController::getRequest' => 'order',
  'PaymentController::execute' => 'order',
  'PaymentController::executeBlock' => 'order',
  'PaymentController::setLayout' => 'order',
  'PaymentController::removeLayout' => 'order',
  'PaymentController::getLayout' => 'order',
  'PaymentController::getBlocks' => 'order',
  'PaymentController::setControllerName' => 'order',
  'PaymentController::getControllerName' => 'order',
  'PaymentController::addBlock' => 'order',
  'PaymentController::removeBlock' => 'order',
  'PaymentController::setBlockName' => 'order',
  'PaymentController::getBlockName' => 'order',
  'PaymentController::setParentController' => 'order',
  'PaymentController::getParentController' => 'order',
);
?>