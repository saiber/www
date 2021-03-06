<?php

ClassLoader::import('application.model.datasync.ModelApi');
ClassLoader::import('application.model.datasync.api.reader.XmlUserApiReader');
ClassLoader::import('application/model.datasync.CsvImportProfile');
ClassLoader::import('application.helper.LiveCartSimpleXMLElement');

/**
 * Web service access layer for User model
 *
 * @package application.model.datasync
 * @author Integry Systems <http://integry.com>
 *
 */

class UserApi extends ModelApi
{
	private $listFilterMapping = null;
	protected $application;

	public static function canParse(Request $request)
	{
		return parent::canParse($request, array('XmlUserApiReader'));
	}

	public function __construct(LiveCart $application)
	{
		parent::__construct(
			$application,
			'User',
			array('preferences') // fields to ignore in User model
		);
		$this->addSupportedApiActionName('import','do_login', 'do_register', 'email_exist');
	}

	public function email_exist() {
		$request = $this->application->getRequest();
		$email = $request->get('email');
		//throw new Exception('Email not exist ' . $email);

		$user = User::getInstanceByEmail($email);
		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c') . '"></response>');

		if(isset($user)) {
			$response->addChild('state','1');
		} else {
			$response->addChild('state','0');
		}
		return new SimpleXMLResponse($response);
	}
	
	public function do_register()  {
		$request = $this->application->getRequest();
		$first_name = $request->get('firstName');
		$last_name = $request->get('lastName');
		$company = $request->get('companyName');
		$email = $request->get('email');
		$pass = $request->get('password');

		if(!isset($first_name) || !isset($last_name) || !isset($email) || !isset($pass)) {
			throw new Exception("Please complete required field " .$last_name);
		}

		$user = User::getInstanceByEmail($email);
		if(isset($user)) {
			throw new Exception('User already exist');
		}
		$user = User::getNewInstance($email, $pass);
		$user->firstName->set($first_name);
		$user->lastName->set($last_name);
		if(isset($company)) {
			$user->companyName->set($company);
		}
		$user->email->set($email);
		$user->isEnabled->set('1');
		$user->save();

		$code = rand(1, 10000000) . rand(1, 10000000);
		$user->setPreference('confirmation', $code);
		$user->save();

		$_email = new Email($this->application);
		$_email->setUser($user);
		$_email->set('code', $code);
		$_email->setTemplate('user.confirm');
		$_email->send();

		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c') . '"></response>');
		$response->addChild('state','1');
		return new SimpleXMLResponse($response);
	}



	public function do_login() {
		$request = $this->application->getRequest();
		$email = $request->get('email');
		$password = $request->get('password');
		$user = User::getInstanceByLogin($email, $password);

		if (!$user) {
			throw new Exception('User error login for email: '. $email. ', password: '. $password);
		}

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


		$parser = $this->getParser();
		$users_record = ActiveRecordModel::getRecordSetArray('User', select(eq(f('User.ID'), $user->getID())));

		$apiFieldNames = $parser->getApiFieldNames();

		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c'). " users".count($users_record) . '"></response>');
		$responseCustomer = $response->addChild('customer');

		$_user = array_shift($users_record);
		unset($_user['password']);

		foreach($_user as $k => $v)
		{
			if(in_array($k, $apiFieldNames))
			{
				$responseCustomer->addChild($k, $v);
			}
		}
		return new SimpleXMLResponse($response);
	}

	public function import()
	{
		$updater = new ApiUserImport($this->application);
		$profile = new CsvImportProfile('User');
		$reader = $this->getDataImportIterator($updater, $profile);
		$updater->setCallback(array($this, 'importCallback'));
		$updater->importFile($reader, $profile);

		return $this->statusResponse($this->importedIDs, 'imported');
	}


	public function create()
	{
		$updater = $this->getImportHandler();
		$updater->allowOnlyCreate();
		$profile = new CsvImportProfile('User');
		$reader = $this->getDataImportIterator($updater, $profile);
		$updater->setCallback(array($this, 'importCallback'));
		$updater->importFile($reader, $profile);

		return $this->statusResponse($this->importedIDs, 'created');
	}

	public function update()
	{
		//
		// DataImport will find user by id, if not found by email, if not found then create new
		// if requesting to change user email (provaiding ID and new email),
		//
		// threrefore check if user exists here.
		//
		$request = $this->application->getRequest();
		$id = $this->getRequestID(true);
		if($id != '' && $request->get('email') != '')
		{
			$users = ActiveRecordModel::getRecordSetArray('User',
				select(eq(f('User.ID'), $id))
			);
			if(count($users) == 0)
			{
				throw new Exception('User not found');
			}
		}
		$updater = new ApiUserImport($this->application);
		$updater->allowOnlyUpdate();
		$profile = new CsvImportProfile('User');
		$reader = $this->getDataImportIterator($updater, $profile);
		$updater->setCallback(array($this, 'importCallback'));
		$updater->importFile($reader, $profile);

		return $this->statusResponse($this->importedIDs, 'updated');
	}

	public function delete()
	{
		$request = $this->getApplication()->getRequest();
		$id = $this->getRequestID();
		$instance = User::getInstanceByID($id, true);
		$instance->delete();
		return $this->statusResponse($id, 'deleted');
	}

	public function get()
	{
		$request = $this->application->getRequest();
		$parser = $this->getParser();
		$users = ActiveRecordModel::getRecordSetArray('User',
			select(eq(f('User.ID'), $this->getRequestID()))
		);
		if(count($users) == 0)
		{
			throw new Exception('User not found');
		}
		$apiFieldNames = $parser->getApiFieldNames();
		$addressFieldNames = array('firstName', 'lastName', 'address1', 'address2', 'city', 'stateName', 'postalCode', 'phone');

		// --
		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c').'"></response>');
		$responseCustomer = $response->addChild('customer');
		while($user = array_shift($users))
		{
			foreach($user as $k => $v)
			{
				if(in_array($k, $apiFieldNames))
				{
					$responseCustomer->addChild($k, $v);
				}
			}

			// todo: join? how?? m?!
			$u = User::getInstanceByID($user['ID']);
			$u->loadAddresses();
			// default billing and shipping addreses
			foreach(array('defaultShippingAddress', 'defaultBillingAddress') as $addressType)
			{
				if(is_numeric($user[$addressType.'ID']))
				{
					$address = $u->defaultBillingAddress->get()->userAddressID->get();
					foreach($addressFieldNames as $addressFieldName)
					{
						$responseCustomer->addChild($addressType.'_'.$addressFieldName, $address->$addressFieldName->get());
					}
				}
			}
			$this->mergeUserEavFields($responseCustomer, $u);
			$this->clear($u);
		}
		return new SimpleXMLResponse($response);
	}

	public function filter() // synonym to list method
	{
		$response = new LiveCartSimpleXMLElement('<response datetime="'.date('c').'"></response>');
		$parser = $this->getParser();
		$customers = User::getRecordSetArray('User',$parser->getARSelectFilter(), true);

		// $addressFieldNames = array_keys(ActiveRecordModel::getSchemaInstance('UserAddress')->getFieldList());
		$addressFieldNames = array('firstName', 'lastName', 'address1', 'address2', 'city', 'stateName', 'postalCode', 'phone');
		$userFieldNames = $parser->getApiFieldNames();

		foreach($customers as $customer)
		{
			$customerNode = $response->addChild('customer');
			foreach($userFieldNames as $fieldName)
			{
				$customerNode->addChild($fieldName, is_string($customer[$fieldName])? $customer[$fieldName] : '');
			}

			// todo: join? how?? m?!
			$u = User::getInstanceByID($customer['ID'], true);
			$u->loadAddresses();
			// default billing and shipping addreses
			foreach(array('defaultShippingAddress', 'defaultBillingAddress') as $addressType)
			{
				if(is_numeric($customer[$addressType.'ID']))
				{
					$address = $u->defaultBillingAddress->get()->userAddressID->get();
					foreach($addressFieldNames as $addressFieldName)
					{
						$customerNode->addChild($addressType.'_'.$addressFieldName, $address->$addressFieldName->get());
					}
				}
			}
			$this->mergeUserEavFields($customerNode, $u);
			$this->clear($u);
		}
		return new SimpleXMLResponse($response);
	}

	private function mergeUserEavFields($customerNode, $u)
	{
		$eavFieldsNode = $customerNode->addChild('EavFields');
		if($u->eavObjectID->get())
		{
			$u->getSpecification();
			$userArray = $u->toArray();
			$attributes = array();
			foreach($userArray['attributes'] as $attr)
			{
				$attrData = array(
					'ID' => $attr['EavField']['ID'],
					'handle' => $attr['EavField']['handle'],
					'name' => $attr['EavField']['name'],
					'value' => '');
				if ($attr['EavField'] && (isset($attr['values']) || isset($attr['value']) || isset($attr['value_lang'])))
				{
					if (isset($attr['values']))
					{
						foreach ($attr['values'] as  $value)
						{
							$attrData['value'][] = $value['value_lang'];
						}
					} else if (isset($attr['value_lang'])) {
						$attrData['value'] = $attr['value_lang'];
					} else if(isset($attr['value'])) {
						$attrData['value'] = $attr['EavField']['valuePrefix_lang'] . $attr['value'] . $attr['EavField']['valueSuffix_lang'];
					}
				}
				$attributes[] = $attrData;
			}
			foreach($attributes as $attr)
			{
				$eavFieldNode = $eavFieldsNode->addChild('EavField');
				foreach($attr as $key => $value)
				{
					if(is_array($value))
					{
						$node = $eavFieldNode->addChild($key.'s');
						foreach($value as $v)
						{
							$node->addChild($key, $v);
						}
					}
					else
					{
						$eavFieldNode->addChild($key, $value);
					}
				}
			}
		}
	}
}

ClassLoader::import("application.model.datasync.import.UserImport");
// misc things
// @todo: in seperate file!

class ApiUserImport extends UserImport
{
	const CREATE = 1;
	const UPDATE = 2;

	private $allowOnly = null;
	public function allowOnlyUpdate()
	{
		// todo: use options add, create
		$this->allowOnly = self::UPDATE;
	}

	public function allowOnlyCreate()
	{
		// todo: use options add, create
		$this->allowOnly = self::CREATE;
	}

	public function getClassName()  // because dataImport::getClassName() will return ApiUser, not User.
	{
		return substr(parent::getClassName(),3); // cut off Api from class name
	}

	public // one (bad) implementation of delete() action calls this method, therefore public
	function getInstance($record, CsvImportProfile $profile)
	{
		$instance = parent::getInstance($record, $profile);

		$e = $instance->isExistingRecord();
		if($this->allowOnly == self::CREATE && $e == true)
		{
			throw new Exception('Record exists');
		}
		if($this->allowOnly == self::UPDATE && $e == false)
		{
			throw new Exception('Record not found');
		}
		return $instance;
	}
}

?>
