<script lang="ts">
	import Birds from '$lib/components/Birds.svelte';
	import BlossomBranch from '$lib/components/BlossomBranch.svelte';
	import DeerAntler from '$lib/components/DeerAntler.svelte';
	import InkCharacter from '$lib/components/InkCharacter.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<div class="relative min-h-screen overflow-x-clip bg-paper text-ink">
	<div class="bg-grain" aria-hidden="true"></div>
	<div class="page-mat hidden 2xl:block" aria-hidden="true"></div>

	<div class="fixed right-5 top-4 z-50 md:right-8 md:top-5">
		<ThemeToggle />
	</div>

	<main class="mx-auto flex min-h-screen max-w-[1400px] items-center px-5 py-24 md:px-8">
		<div class="grid w-full gap-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-24">
			{@render children()}

			<!-- margin art: the deer, its antler, a climbing branch -->
			<aside class="relative hidden lg:block" aria-hidden="true">
				<div class="relative h-full overflow-hidden border-l border-line pl-16">
					<div class="deco -right-10 -top-10 w-72">
						<BlossomBranch className="h-full w-full" />
					</div>

					<div class="relative text-[11rem] leading-[0.8]">
						<InkCharacter char="鹿" opacity={0.09} blur={1.5} className="block" />
					</div>

					<p class="relative mt-10 max-w-sm text-sm leading-relaxed text-ink2">
						<span class="eyebrow mb-3 block text-moss">Your index</span>
						Work through Heisig's frames and mark each character as you go — <em>learning</em> while
						it is still settling, <em>known</em> once it has. Traditional and simplified are counted
						separately, so each book keeps its own place.
					</p>

					<div class="relative mt-12 flex items-end gap-10">
						<span class="block aspect-[150/64] w-40">
							<Birds opacity={0.45} className="h-full w-full" />
						</span>
						<span class="block aspect-[150/96] w-24">
							<DeerAntler opacity={0.8} className="h-full w-full" />
						</span>
					</div>
				</div>
			</aside>
		</div>
	</main>
</div>
