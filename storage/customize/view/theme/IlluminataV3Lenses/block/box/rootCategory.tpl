{defun name="rootdynamicCategoryTree" node=false filters=false}
	{if $node}
		{foreach from=$node item=category}
				<div class="li {if $category.parentNodeID == 1}top{/if} {if $category.lft <= $currentCategory.lft && $category.rgt >= $currentCategory.rgt} dynCurrent{/if}{if $category.subCategories} hasSubs{else} noSubs{/if}">
					<a href="{categoryUrl data=$category filters=$category.filters}">{$category.name_lang}</a>
					{if $category.subCategories}
						<div class="wrapper">
							<div class="block"><div class="block">
								<div class="ul">
				   					{fun name="rootdynamicCategoryTree" node=$category.subCategories}
				   				</div>
				   			</div></div>
				   		</div>
					{/if}
				</div>
		{/foreach}
	{/if}
{/defun}

<div class="rootCategoriesWrapper1">
	<div class="rootCategoriesWrapper2">
		<div class="ul rootCategories{if $currentId == $categories.0.ID} firstActive{/if}" id="rootCategories">
			{fun name="rootdynamicCategoryTree" node=$categories}

			{foreach from=$pages item=page name=pages}
				<div class="li top {if $smarty.foreach.pages.last}last {/if}{if $page.ID == $currentId}current{/if}{if !$subPages[$page.ID]}noSubs{/if}"><a href="{pageUrl data=$page}"><span class="name">{$page.title_lang}</span></a>
				{if $subPages[$page.ID]}
					<div class="wrapper">
						<div class="block"><div class="block">
							<div class="ul">
								{foreach $subPages[$page.ID] as $page}
									<div class="li"><a href="{pageUrl data=$page}"><span>{$page.title_lang}</span></a></div>
								{/foreach}
							</div>
						</div></div>
					</div>
				{/if}
				</div>
			{/foreach}
			<div class="li pad" style="width: 1px; background: none;">&nbsp;</div>
			<div class="clear"></div>
		</div>
	</div>
</div>

{literal}
<!--[if lte IE 6]>
<script type="text/javascript">
	$A($('rootCategories').getElementsBySelector('.top')).each(function(li)
	{
		Event.observe(li, 'mouseover', function()
		{
			li.addClassName('hover');
			var wrapper = li.down('div.wrapper');
			if (wrapper)
			{
				wrapper.style.width = 120;
			}
		});
		Event.observe(li, 'mouseout', function() { li.removeClassName('hover'); });
	});
</script>
<![endif]-->
{/literal}
