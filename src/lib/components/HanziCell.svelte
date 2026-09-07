<script lang="ts">
	import { charOf, frameOf, kwOf, type RawRow, type Script } from '$lib/hanzi';

	let {
		row,
		script,
		rank,
		active = false,
		onclick
	}: {
		row: RawRow;
		script: Script;
		rank: number;
		active?: boolean;
		onclick?: (id: number) => void;
	} = $props();

	const frame = $derived(frameOf(row, script));
</script>

<button
	type="button"
	aria-label={`${charOf(row, script)} — ${kwOf(row, script) || 'no keyword'}${frame != null ? `, frame ${frame}` : ''}`}
	onclick={() => onclick?.(row.id)}
	class={[
		'group relative flex min-h-[6.5rem] w-full cursor-pointer flex-col items-center justify-between bg-paper px-2 pb-2 pt-5 text-center outline-offset-[-3px] transition-colors md:min-h-[7.5rem] md:pb-2.5',
		active ? 'bg-ink/[0.045]' : 'hover:bg-ink/[0.035]'
	].join(' ')}
>
	<span
		class={['tnum absolute left-2.5 top-2 text-[9px] leading-none tracking-[0.12em] md:text-[10px]', active ? 'text-accent' : 'text-faint']}
		aria-hidden="true"
	>
		{String(rank).padStart(4, '0')}
	</span>

	<span
		class={[
			'char-hanzi select-none text-[2rem] transition-transform duration-200 ease-out group-hover:scale-[1.06] md:text-[2.35rem]',
			active ? 'text-accent' : ''
		].join(' ')}
	>
		{charOf(row, script)}
	</span>

	<span
		class={[
			'max-w-full truncate text-[10px] font-medium leading-tight tracking-[0.02em] md:text-[11px]',
			active ? 'text-ink' : 'text-ink2 group-hover:text-ink'
		].join(' ')}
	>
		{kwOf(row, script) || '\u00a0'}
	</span>
</button>
