<?php /* Smarty version 2.6.26, created on 2015-12-01 12:15:49
         compiled from custom:backend/newsletter/recipientCount.tpl */ ?>
<?php require_once(SMARTY_CORE_DIR . 'core.load_plugins.php');
smarty_core_load_plugins(array('plugins' => array(array('function', 'maketext', 'custom:backend/newsletter/recipientCount.tpl', 2, false),)), $this); ?>
<span class="progressIndicator" style="display: none;"></span>
<?php echo smarty_function_maketext(array('text' => "[quant,_1,recipient,recipients,No matching recipients]",'params' => $this->_tpl_vars['count']), $this);?>