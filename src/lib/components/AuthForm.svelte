<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { base } from '$app/paths';
	import { authClient } from '$lib/auth-client';

	let {
		mode,
		redirectTo
	}: {
		mode: 'login' | 'signup';
		/** same-site path to land on once the session exists */
		redirectTo: string;
	} = $props();

	const isSignup = $derived(mode === 'signup');

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let pending = $state(false);
	let error = $state('');

	/** Turn better-auth's codes into something a person would say. */
	function friendly(message?: string, status?: number): string {
		const m = (message ?? '').toLowerCase();
		if (m.includes('already exists')) return 'An account with that email already exists — sign in instead.';
		if (m.includes('invalid email or password') || m.includes('invalid credentials') || m.includes('invalid_password'))
			return 'That email and password do not match an account.';
		if (m.includes('password') && (m.includes('short') || m.includes('length')))
			return 'Passwords need at least 8 characters.';
		if (m.includes('invalid email')) return 'That does not look like an email address.';
		if (status === 429) return 'Too many attempts just now. Wait a moment and try again.';
		return message?.trim() || 'Something went wrong. Please try again.';
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		error = '';

		const mail = email.trim();
		const who = name.trim();

		if (isSignup && !who) return void (error = 'Please add a name for your account.');
		if (!mail) return void (error = 'Please enter your email address.');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
			return void (error = 'That does not look like an email address.');
		if (password.length < 8) return void (error = 'Passwords need at least 8 characters.');

		pending = true;
		try {
			const result = isSignup
				? await authClient.signUp.email({ name: who, email: mail, password })
				: await authClient.signIn.email({ email: mail, password, rememberMe: true });

			if (result.error) {
				error = friendly(result.error.message, result.error.status);
				return;
			}

			// The cookie is set; re-run server loads so `data.user` is populated
			// before the destination renders.
			await invalidateAll();
			await goto(redirectTo, { invalidateAll: true });
		} catch {
			error = 'Could not reach the server. Check your connection and try again.';
		} finally {
			pending = false;
		}
	}

	const field =
		'w-full rounded-[3px] border border-line bg-panel px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-ink';
</script>

<div class="w-full max-w-[26rem]">
	<div class="mb-9 flex items-center gap-3.5">
		<span>
			<span class="eyebrow block text-moss">PINE-3000</span>
			<span class="mt-1 block text-[11px] leading-none text-faint">
				<span class="char-hanzi text-sm text-ink2" lang="zh">松</span> nature × technology
			</span>
		</span>
	</div>

	<h1 class="serif-word text-[2.1rem] font-light leading-[1.1] tracking-[-0.01em]">
		{isSignup ? 'Begin your index' : 'Welcome back'}
	</h1>
	<p class="mt-4 text-sm leading-relaxed text-ink2">
		{#if isSignup}
			An account keeps your place: mark the characters you know in either book, and watch the
			count climb.
		{:else}
			Sign in to pick up your characters where you left them.
		{/if}
	</p>

	<form onsubmit={submit} novalidate class="mt-8 flex flex-col gap-5">
		{#if isSignup}
			<div>
				<label class="eyebrow mb-2 block" for="name">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					autocomplete="name"
					placeholder="How should we address you?"
					bind:value={name}
					class={field}
				/>
			</div>
		{/if}

		<div>
			<label class="eyebrow mb-2 block" for="email">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				placeholder="you@example.com"
				bind:value={email}
				class={field}
			/>
		</div>

		<div>
			<label class="eyebrow mb-2 block" for="password">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete={isSignup ? 'new-password' : 'current-password'}
				placeholder={isSignup ? 'at least 8 characters' : '••••••••'}
				bind:value={password}
				class={field}
			/>
			{#if isSignup}
				<p class="mt-2 text-[11px] leading-relaxed text-faint">
					Eight characters or more. Nothing else is required.
				</p>
			{/if}
		</div>

		{#if error}
			<p
				role="alert"
				class="border-l-2 border-cinnabar bg-cinnabar/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-cinnabarink"
			>
				{error}
			</p>
		{/if}

		<button
			type="submit"
			disabled={pending}
			class="mt-1 w-full cursor-pointer rounded-[3px] bg-ink px-4 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
		>
			{pending ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
		</button>
	</form>

	<p class="mt-7 border-t border-line pt-6 text-[12px] leading-relaxed text-ink2">
		{#if isSignup}
			Already keeping an index?
			<a class="underline decoration-line underline-offset-4 hover:text-ink" href={`${base}/login${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>Sign in</a>
		{:else}
			New here?
			<a class="underline decoration-line underline-offset-4 hover:text-ink" href={`${base}/signup${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>Create an account</a>
		{/if}
	</p>

	<p class="mt-6">
		<a
			class="group inline-flex items-center gap-2 text-[12px] text-ink2 transition-colors hover:text-ink"
			href={`${base}/`}
		>
			<span class="inline-block transition-transform group-hover:-translate-x-0.5" aria-hidden="true">←</span>
			Back to the character index
		</a>
	</p>
</div>
