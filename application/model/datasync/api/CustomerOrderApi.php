<?php

ClassLoader::import('application.model.datasync.ModelApi');
ClassLoader::import('application.model.datasync.api.reader.XmlCustomerOrderApiReader');
ClassLoader::import('application.model.datasync.import.CustomerOrderImport');
ClassLoader::import('application/model.datasync.CsvImportProfile');
ClassLoader::import('application/model.order.CustomerOrder');
ClassLoader::import('application.helper.LiveCartSimpleXMLElement');
ClassLoader::importNow("application.helper.AppleAPNService");
/**
 * Web service access layer for CustomerOrder model
 *
 * @package application.model.datasync
 * @author Integry Systems <http://integry.com>
 * 
 */

class CustomerOrderApi extends ModelApi
{
	private $listFilterMapping = null;
	protected $application;

	public static function canParse(Request $request)
	{
		return parent::canParse($request, array('XmlCustomerOrderApiReader'));
	}

	public function __construct(LiveCart $application)
	{
		parent::__construct(
			$application,
			'CustomerOrder',
			array() // fields to ignore in CustomerOrder model
		);
		$this->addSupportedApiActionName('test');
		$this->addSupportedApiActionName('invoice');
		$this->addSupportedApiActionName('capture');
		$this->addSupportedApiActionName('cancel');
		$this->addSupportedApiActionName('import');
		$this->addSupportedApiActionName('user_cart');
		$this->addSupportedApiActionName('add_to_cart');
		$this->addSupportedApiActionName('select_shipment');
	}


	public function test () {
		$request = $this->application->getRequest();
		$orderID =  $request->get('ID');

		$order = CustomerOrder::getInstanceById($orderID, CustomerOrder::LOAD_DATA);
		$service = new AppleAPNService($this->application);

		$ret = $service->SendUserOrderMessage($order, 'Order is not active');

		if($ret) {
			throw new Exception('MESSAGE SUCCESS SEND');
		} else {
			throw new Exception('ERROR SENDING MESSAGE');
		}
		throw new Exception('CONFIG : ' . $this->application->config->get('NOTIFICATION_EMAIL'));
	}


	public function user_cart() {
		$request = $this->application->getRequest();
		$userID = $request->get('userID');
		if(intval($userID) > 0) {
			return $this->apiActionGetOrdersBySelectFilter(select(eq(f('CustomerOrder.userID'), $userID)));
		} else {
			throw new Exception('User ID is required');
		}
	}

	public function invoice()
	{
		return $this->apiActionGetOrdersBySelectFilter(
			select(eq(
				f('CustomerOrder.invoiceNumber'),
				$this->getApplication()->getRequest()->get('ID'))));
	}

	public function get()
	{
		return $this->apiActionGetOrdersBySelectFilter(
			select(eq(
				f('CustomerOrder.ID'),
				$this->getApplication()->getRequest()->get('ID'))));
	}

	public function filter()
	{
		$request = $this->application->getRequest();
		$ID = $request->get('ID');
		if(intval($ID) > 0 && isset($ID)) {
			$order = CustomerOrder::getInstanceById($ID);
			$order->loadAll();
			$order->getTotal(true);
			$order->totalAmount->set($order->getTotal(true));
			$order->getTaxAmount();

			$user = $order->user->get();
			$user->load();
			$user->loadAddresses();

			$shipping = $user->defaultShippingAddressID->get();
			$billing = $user->defaultBillingAddressID->get();

			if(!isset($shipping)) {
				$user_shipping_address = UserAddress::getNewInstance();
				$user_shipping_address->firstName->set($user->firstName->get());
				$user_shipping_address->lastName->set($user->lastName->get());
				$user_shipping_address->companyName->set($user->companyName->get());
				$user_shipping_address->save();
				$shipping_address = ShippingAddress::getNewInstance($user, $user_shipping_address);
				$shipping_address->save();
			}

			if(!isset($billing)) {
				$user_billing_address = UserAddress::getNewInstance();
				$user_billing_address->firstName->set($user->firstName->get());
				$user_billing_address->lastName->set($user->lastName->get());
				$user_billing_address->companyName->set($user->companyName->get());
				$user_billing_address->save();
				$billing_address = BillingAddress::getNewInstance($user, $user_billing_address);
				$billing_address->save();
			}

			$shippingAddressID = $order->shippingAddressID->get();
			$billingAddressID = $order->billingAddressID->get();

			if(!isset($shippingAddressID)) {
				$_shipping = $user->defaultShippingAddressID->get();
				$_shipping->load();
				$ua1 = $_shipping->userAddress->get();
				$ua1->load();
				$order->shippingAddressID->set($ua1);
			}

			if(!isset($billingAddressID)) {
				$_billing = $user->defaultBillingAddressID->get();
				$_billing->load();
				$ua2 = $_billing->userAddress->get();
				$ua2->load();
				$order->billingAddressID->set($ua2);
			}

			foreach ($order->getShipments() as $shipment) {
				if (!$shipment->getSelectedRate())
				{
					$shipment->shippingAmount->set(0);
				}
			}
			foreach ($order->getShipments() as $shipment)
			{
				$shipment->setAvailableRates(null);
				$shipment->shippingAddress->set($order->shippingAddress->get());
			}

			$order->serializeShipments();

			$order->save(true);
		}
		return $this->apiActionGetOrdersBySelectFilter($this->getParser()->getARSelectFilter(), true);
	}
	
	public function delete()
	{
		$order = CustomerOrder::getInstanceByID($this->getRequestID());
		$id = $order->getID();
		$order->delete();
		return $this->statusResponse($id, 'deleted');
	}

	public function capture()
	{
		$order = CustomerOrder::getInstanceByID($this->getRequestID());
		foreach ($order->getTransactions() as $transaction)
		{
			$transaction->capture($transaction->amount->get());
		}

		return $this->statusResponse($order->getID(), 'captured');
	}
	
	public function cancel()
	{
		$order = CustomerOrder::getInstanceByID($this->getRequestID());
		$order->cancel();

		return $this->statusResponse($order->getID(), 'canceled');
	}
	
	public function import()
	{
		$updater = new ApiCustomerOrderImport($this->application);
		$profile = new CsvImportProfile('CustomerOrder');
		$reader = $this->getDataImportIterator($updater, $profile);
		$updater->setCallback(array($this, 'importCallback'));
		$updater->importFile($reader, $profile);
		
		return $this->statusResponse($this->importedIDs, 'imported');
	}


	public function create()
	{
		$request = $this->application->getRequest();
		$user = User::getInstanceByID($request->get('userID'));
		$user->load(true);
		$user->loadAddresses();
		$new_order = CustomerOrder::getNewInstance($user);
		$new_order->setUser($user);
		$new_order->loadAll();
		$new_order->getShipments();
		$new_order->getTotal(true);
		$new_order->save(true);

		$address = $user->defaultShippingAddress->get();
		if (!$address)
		{
			$address = $user->defaultBillingAddress->get();
		}

		if (!$new_order->shippingAddress->get() && $address /*&& $this->isShippingRequired($this->order)*/)
		{
			$userAddress = $address->userAddress->get();
			$new_order->shippingAddress->set($userAddress);
			$new_order->save(true);
		}

		$address = $user->defaultBillingAddress->get();
		if (!$new_order->billingAddress->get() && $address)
		{
			$userAddress = $address->userAddress->get();
			$new_order->billingAddress->set($userAddress);
			$new_order->save(true);
		}
		$new_order->loadAll();

		return $this->apiActionGetOrdersBySelectFilter(select(eq( f('CustomerOrder.ID'),  $new_order->getFieldValue('ID'))));
	}

	public function update()
	{
		$userID = $this->getApplication()->getRequest()->get('userID');
		$orderID = $this->getApplication()->getRequest()->get('ID');

		if(intval($userID) == 0 || intval($orderID) == 0) {
			throw new Exception("User and Order ID not set");
		}
		$user = User::getInstanceByID($userID);
		$order = CustomerOrder::getInstanceById($orderID);

		$user->load();
		$user->loadAddresses();
		$order->loadAll();
		
		return $this->apiActionGetOrdersBySelectFilter(select(eq( f('CustomerOrder.ID'), $this->getApplication()->getRequest()->get('ID'))));
	}
	
	// --
	
	private function fillResponseItem($xml, $item)
	{
		parent::fillSimpleXmlResponseItem($xml, $item);
	
		$userFieldNames = array('userGroupID','email', 'firstName','lastName','companyName','isEnabled');
		$addressFieldNames = array('stateID','phone', 'firstName','lastName','companyName','phone', 'address1', 'address2', 'city', 'stateName', 'postalCode', 'countryID', 'countryName', 'fullName', 'compact');
		$cartItemFieldNames = array('name','ID','productID', 'customerOrderID', 'shipmentID', 'price', 'count', 'reservedProductCount',  'dateAdded', 'isSavedForLater');

		// User
		if(array_key_exists('User', $item))
		{
			foreach($userFieldNames as $fieldName)
			{
				$xml->addChild('User_'.$fieldName, isset($item['User'][$fieldName]) ? $item['User'][$fieldName] : '');
			}
		}

		// Shipping and billing addresses
		foreach(array('ShippingAddress','BillingAddress') as $addressType)
		{
			if(array_key_exists($addressType, $item))
			{
				foreach($addressFieldNames as $fieldName)
				{
					$xml->addChild($addressType.'_'.$fieldName, isset($item[$addressType], $item[$addressType][$fieldName]) ? $item[$addressType][$fieldName] : '');
				}
			}
		}
		
		// cart itmes
		if(array_key_exists('cartItems', $item))
		{
			$xmlProducts = $xml->addChild('Products');
			foreach($item['cartItems'] as $cartItem)
			{
				$ci = $xmlProducts->addChild('Product');
				$ci->addChild('sku', isset($cartItem['nameData'], $cartItem['nameData']['sku']) ? $cartItem['nameData']['sku'] : '');
				foreach($cartItemFieldNames as $fieldName)
				{
					$ci->addChild($fieldName, isset($cartItem[$fieldName]) ? $cartItem[$fieldName] : '');
				}
			}
		}

		// more?
	}

	// this one handles list(), filter(), get() and invoice() actions
	private function apiActionGetOrdersBySelectFilter($ARSelectFilter, $allowEmptyResponse=false)
	{
		set_time_limit(0);
		$ARSelectFilter->setOrder(new ARExpressionHandle(('CustomerOrder.ID')), 'DESC');
		$customerOrders = ActiveRecordModel::getRecordSet('CustomerOrder', $ARSelectFilter, array('User'));
		if($allowEmptyResponse == false && count($customerOrders) == 0)
		{
			throw new Exception('Order not found');
		}
		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c').'"></response>');
		foreach($customerOrders as $order)
		{
			$order->loadAll();
			$transactions = $order->getTransactions();
			$this->fillResponseItem($response->addChild('order'), $order->toArray());

			unset($order);
			ActiveRecord::clearPool();
		}
		return new SimpleXMLResponse($response);
	}
}

// misc things
ClassLoader::import("application.model.datasync.import.UserImport");

class ApiCustomerOrderImport extends CustomerOrderImport
{
	const CREATE = 1;
	const UPDATE = 2;

	private $allowOnly = null;
	public function allowOnlyUpdate()
	{
		$this->allowOnly = self::UPDATE;
	}

	public function allowOnlyCreate()
	{
		$this->allowOnly = self::CREATE;
	}
	
	
	public function getClassName()
	{	
		return str_replace('Api', '', parent::getClassName());
	}
}

?>
