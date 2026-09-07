<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}
	let {
		options,
		value,
		label,
		onchange
	}: {
		options: Option[];
		value: string;
		label: string;
		onchange?: (value: string) => void;
	} = $props();
</script>

<div class="inline-flex items-center gap-3" role="group" aria-label={label}>
	<span class="eyebrow hidden sm:block" aria-hidden="true">{label}</span>
	<div class="flex items-stretch overflow-hidden rounded-[3px] border border-line">
		{#each options as opt (opt.value)}
			<button
				type="button"
				aria-pressed={value === opt.value}
				class={[
					'cursor-pointer border-l border-line px-3.5 py-2 text-xs transition-colors first:border-l-0',
					value === opt.value
						? 'bg-ink font-semibold text-paper'
						: 'text-ink2 hover:bg-ink/5 hover:text-ink'
				].join(' ')}
				onclick={() => onchange?.(opt.value)}
			>
				{opt.label}
			</button>
		{/each}
	</div>
</div>
