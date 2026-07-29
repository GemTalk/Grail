! ===============================================================================
! Base patch: let env-1 session methods reach RESTRICTED kernel classes (4.0+MR#6)
! ===============================================================================
! INTERIM.  Run as SystemUser, from install_base.sh, ONLY when
!   * GemStone MR #6 is present (the 3-arg
!     GsPackagePolicy>>permitSessionMethodFor:selector:environmentId: exists), AND
!   * scripts/detect_env1_restricted_classes.gs reports GRAIL_ENV1_RESTRICTED=no
!
! This patch becomes an unapplied no-op as soon as a rebuilt base image answers
! the probe correctly -- install_base.sh gates on the BEHAVIOUR, not the version,
! so nothing here needs removing later.  Delete this file once no supported 4.0
! build needs it.
!
! ------------------- Defect 1: the env-aware gate is dead code
!
! MR #6 added an environment-aware variant of permitSessionMethodFor:selector:,
! whose whole point is stated in its own comment: restrictedClasses guards
! environment 0 only, because the machinery it protects (index / B-tree
! maintenance, protected-mode sections, the session-method rebuild itself) runs in
! environment 0 and dispatches the env-0 method dictionaries of those classes.  A
! higher environment has a separate transient method dictionary that this
! machinery never consults, so those classes may safely carry session methods
! there.
!
! But the shipped 3-arg method keeps the OLD unconditional check from the 2-arg
! version, and it runs FIRST:
!
!     (self class restrictedClasses includes: thisName) ifTrue: [ ^false ].
!     "restrictedClasses guards environment 0 only. ..."
!     (envId == 0 and: [ self class restrictedClasses includes: thisName ])
!         ifTrue: [ ^ false ].
!
! The first line returns false for a restricted class at ANY envId, so the
! env-aware line below it is unreachable and the feature has no effect.  Measured
! on 4.0.0 (build 2026-07-23, branch jfoster/env1-session-methods): GsNMethod /
! System / SymbolDictionary all answer false at envId 1, while unrestricted
! classes answer true.  Replaying the method's remaining code with the leftover
! line skipped answers true for all three, so that one line is the only blocker.
!
! The fix is to delete it.  This matters to Grail because those three classes hold
! env-1 extensions (builtin_function_or_method.gs -> GsNMethod, System.gs,
! SymbolDictionary.gs); without env-1 session methods on them, Grail must file
! them as SHARED SystemUser methods, which several users on one stone then
! overwrite for each other.
!
! ------------------- Deliberately NOT fixed: `thisClass name asSymbol'
!
! The 3-arg method does `thisName := aBehavior thisClass name asSymbol' unguarded,
! where the 2-arg variant carries an anonymous-class guard (see "Fix 2" in
! scripts/session_methods_env1_base_40.gs -- an anonymous class's `name' is not a
! String, so asSymbol DNUs).  That guard is NOT carried across here, on purpose.
!
! The Django case that motivated it (utils.functional lazy() proxies) was a GRAIL
! defect, not a kernel one: the Python code declared a static variable `name' and
! Grail mapped it onto the CLASS instance variable `name'.  With that mapping
! fixed, an anonymous / unnamed class no longer reaches this predicate, so the
! guard would be dead code in a kernel method -- worse than absent.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

! Precondition: MR #6 must be present.  install_base.sh gates on this too; the
! check here keeps the script safe to run standalone (a pre-MR#6 build has no
! 3-arg method and must use session_methods_env1_base_40.gs instead).
run
(GsPackagePolicy canUnderstand: #'permitSessionMethodFor:selector:environmentId:')
	ifFalse: [
		self error: 'fix_env1_restricted_classes.gs: this build has no 3-arg '
			, 'permitSessionMethodFor:selector:environmentId: (pre-MR#6). '
			, 'Use scripts/session_methods_env1_base_40.gs instead.'].
true
%

set compile_env: 0

category: 'session methods support'
method: GsPackagePolicy
permitSessionMethodFor: aBehavior selector: selector environmentId: envId
  "Environment-aware variant of permitSessionMethodFor:selector:.  The protected
   and eligibility checks are performed in the target environment, and writability
   is tested for that environment.

   Grail patch, ONE change from the shipped 4.0 version -- see
   scripts/fix_env1_restricted_classes.gs for the full rationale: removed the
   leftover UNCONDITIONAL restrictedClasses check that preceded (and therefore
   short-circuited) the env-0-only one below, making the env-aware behaviour dead
   code.  Everything else is verbatim."

  | cl thisName |
  cl := aBehavior whichClassIncludesSelector: selector environmentId: envId.
  cl ifNotNil: [
    (cl compiledMethodAt: selector environmentId: envId otherwise: nil)
      ifNotNil: [:m | m _isProtected ifTrue: [ ^ false ] ] ].
  thisName := aBehavior thisClass name asSymbol.
  "restrictedClasses guards environment 0 only.  The machinery it protects -- index
   / B-tree maintenance, protected-mode sections, and the session-method rebuild
   itself -- runs in environment 0 and dispatches the env-0 method dictionaries of
   these classes, where a session override could corrupt the repository or deadlock
   the mechanism.  A higher environment (e.g. env 1, used by Grail/Python) has a
   separate transient method dictionary that this machinery never consults, so those
   classes may safely carry session methods there."
  (envId == 0 and: [ self class restrictedClasses includes: thisName ]) ifTrue: [ ^ false ].
  externalSymbolList do: [:symDict | | possible |
    possible := symDict at: thisName otherwise: nil.
    (possible isBehavior and: [aBehavior theNonMetaClass isVersionOf: possible theNonMetaClass])
      ifTrue: [ ^ true ] ].
  ^ (aBehavior canWriteMethodsEnv: envId) not
%

run
System commitTransaction.
GsFile stdout
	nextPutAll: '==============================================='; lf;
	nextPutAll: ' env-1 session methods on restricted classes:'; lf;
	nextPutAll: ' GsPackagePolicy predicate patched (SystemUser)'; lf;
	nextPutAll: '==============================================='; lf;
	flush.
true
%

logout
