<script lang="ts">
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

			<aside class="relative hidden lg:block" aria-hidden="true">
				<div class="relative h-full overflow-hidden border-l border-line pl-16">	
				Sign up now to test out the site!
				</div>
			</aside>
		</div>
	</main>
</div>
