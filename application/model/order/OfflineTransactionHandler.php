<?php

ClassLoader::import('library.payment.TransactionPayment');
ClassLoader::import('library.payment.TransactionResult');

/**
 *
 *
 * @package application.model.order
 * @author Integry Systems <http://integry.com>
 */
class OfflineTransactionHandler extends TransactionPayment
{
	public function getEnabledMethods()
	{
		$handlers = array();
		$availableHandlers = ActiveRecordModel::getApplication()->getConfig()->get('OFFLINE_HANDLERS');

		if (is_array($availableHandlers))
		{
			foreach (array_keys($availableHandlers) as $handler)
			{
				$handlers[substr($handler, -1)] = $handler;
			}
		}

		return $handlers;
	}

	public function isMethodEnabled($method)
	{
		$handlers = ActiveRecordModel::getApplication()->getConfig()->get('OFFLINE_HANDLERS');
		return !empty($handlers[$method]);
	}

	public function getMethodName($method)
	{
		return ActiveRecordModel::getApplication()->getConfig()->get('OFFLINE_NAME_' . substr($method, -1));
	}

	public function isVoidable()
	{
		return true;
	}

	public function getValidCurrency($currency)
	{
		return $currency;
	}

	public function void()
	{
		$result = new TransactionResult();
		$result->amount->set($this->details->amount->get());
		$result->currency->set($this->details->currency->get());
		$result->setTransactionType(TransactionResult::TYPE_VOID);
		return $result;
	}
}

?>