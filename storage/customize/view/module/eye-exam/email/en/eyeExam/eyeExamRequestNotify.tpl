{'STORE_NAME'|config} eye exam booking confirmation
{if !$html}
Thank you for booking an eye exam at Illuminata Eyewear!

Here are the details of your booking:

Date: {$date}
Time: {$time|substr:0:5}
Doctor Name: {$doctorName}

Illuminata Eyewear
1750 The Queensway, Unit 4
Etobicoke, ON
M9C 5H5

tel. 416-620-8028
e-mail: sales@illuminataeyewear.com

Please come on time! If you are paying by OHIP, please bring your OHIP card and come 10 minutes in advance of your booking.
If your plans change, please be mindfull, and call us. The booking time is reserved for you and no one will be put into this time slot.

{include file="email/en/signature.tpl"}
{/if}{*html*}
{if $html}
Thank you for booking an eye exam at Illuminata Eyewear!

Here are the details of your booking:

Date: {$date}
Time: {$time|substr:0:5}
Doctor Name: {$doctorName}

Illuminata Eyewear
1750 The Queensway, Unit 4
Etobicoke, ON
M9C 5H5

tel. 416-620-8028
e-mail: sales@illuminataeyewear.com

Please come on time! If you are paying by OHIP, please bring your OHIP card and come 10 minutes in advance of your booking.
If your plans change, please be mindfull, and call us. The booking time is reserved for you and no one will be put into this time slot.

{include file="email/en/signature.tpl"}
{/if}{*html*}