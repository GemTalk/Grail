! ===============================================================================
! Repair known-broken host-extent patches to the base system
!   file  src/smalltalk/RepairHostExtent.gs
! ===============================================================================
! Grail is normally installed into a stock extent0.dbf, but it can also be
! installed into a host (e.g. customer) extent that carries its own patches
! to kernel classes.  This file repairs patches known to break Grail.  Every
! repair is guarded so it is a NO-OP on a stock extent and idempotent on a
! patched one — rerunning install.sh after each refresh of the host database
! reapplies whatever is needed.
!
! Filed in from install.gs at the START of the per-user install segment (it runs
! as the ordinary .topazini install user, never SystemUser) — because the known
! patches are GsPackagePolicy SESSION METHODS: they live in the GsPackage held in
! the application's UserGlobals (key #GsPackage_Current) and are merged into
! method lookup at login for every user sharing that UserGlobals.  Recompiling as
! the install user with the
! package policy enabled routes the fixed method back into that same
! GsPackage (no SystemUser privilege needed; the persistent kernel method
! underneath is never touched).
!
! -------------------------------------------------------------------------------
! Repair 1: Behavior >> _basicRemoveSelector:environmentId:
! -------------------------------------------------------------------------------
! GLASS-era change-notification tooling (category '*change-notification':
! SystemChangeNotifier / MethodRemovedAnnouncement / MethodVersionHistory in
! UserGlobals) overrides this kernel method as a session method to announce
! every method removal.  The override predates method environments: its
! `envId ~~ 0` branch never assigns `oldMeth`, so removing any env-1 method
! announces `MethodRemovedAnnouncement itemClass: self method: nil`, and
! `MethodChangeAnnouncement class >> itemClass:method:` then sends #selector
! to nil — a MessageNotUnderstood whose messageText is nil.  Grail removes
! env-1 selectors at runtime (Enum class >> ___grailBuildMembers:names:
! drops the codegen-emitted `value:value:` from every new enum class), so
! e.g. `import werkzeug.http` died building its first Enum (COEP).
!
! The repair guards the announcement with `oldMeth ~~ nil`: the framework
! has nothing meaningful to announce for an environment it predates, and
! env-0 removals (the only ones it was written for) behave exactly as
! before.

set compile_env: 0

run
| sel meth src fixed cat |
sel := #'_basicRemoveSelector:environmentId:'.
meth := Behavior compiledMethodAt: sel otherwise: nil.
meth == nil ifTrue: [
	Transcript show: 'RepairHostExtent: Behavior>>', sel, ' not found -- nothing to repair (OK)'.
	^ nil].
src := meth sourceString.
(src includesString: 'MethodRemovedAnnouncement') ifFalse: [
	Transcript show: 'RepairHostExtent: Behavior>>', sel, ' is unpatched -- nothing to repair (OK)'.
	^ nil].
(src includesString: 'oldMeth ~~ nil') ifTrue: [
	Transcript show: 'RepairHostExtent: Behavior>>', sel, ' already repaired (OK)'.
	^ nil].
fixed := src copyReplaceAll: 'removedFromSelf ifTrue:['
	with: '(removedFromSelf and: [oldMeth ~~ nil]) ifTrue:['.
fixed = src ifTrue: [
	Transcript show: 'RepairHostExtent: WARNING -- Behavior>>', sel,
		' carries the announcement patch but not the expected source shape;',
		' leaving it alone.  Removing any env-1 method will raise a',
		' MessageNotUnderstood (nil #selector) until this is fixed by hand.'.
	^ nil].
cat := Behavior categoryOfSelector: sel environmentId: 0.
[
	Behavior
		compileMethod: fixed
		dictionaries: System myUserProfile symbolList
		category: cat
		environmentId: 0.
	"With GsPackagePolicy enabled this lands in the session GsPackage
	 (UserGlobals at: #GsPackage_Current), replacing the broken override
	 for every session that loads it; the persistent kernel method is
	 untouched.  Commit so the repaired package survives this session."
	System commitTransaction
		ifFalse: [Transcript show: 'RepairHostExtent: WARNING -- commit failed; repair is session-local only.']
		ifTrue: [Transcript show: 'RepairHostExtent: repaired Behavior>>', sel,
			' (guarded method-removal announcement with `oldMeth ~~ nil`) and committed'].
] on: Error do: [:ex |
	Transcript show: 'RepairHostExtent: WARNING -- recompile of Behavior>>', sel,
		' failed (', ex messageText printString,
		').  Removing any env-1 method will raise a MessageNotUnderstood',
		' (nil #selector) until this is fixed by hand.'.
].
%
