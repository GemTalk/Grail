! ===============================================================================
! Probe: can an ordinary user file env-1 session methods on RESTRICTED classes?
! ===============================================================================
! Prints exactly TWO lines, because the two conditions have different consumers:
!
!   GRAIL_ENV1_PERMITTED=yes|no   -- the POLICY permits an env-1 session method on
!       GsNMethod / System / SymbolDictionary / ExecBlock.  This is a property of
!       the base image alone.  install_base.sh tiers on THIS: `no' means the base
!       needs scripts/fix_env1_restricted_classes.gs (or is pre-MR#6).
!
!   GRAIL_ENV1_RESTRICTED=yes|no  -- PERMITTED **and** the files can actually be
!       filed per-user right now.  install.sh gates its per-user include on THIS.
!
! The second condition is that each kernel-extension file's opening
! `removeAllMethods: 1' succeeds.  It does NOT when a previous install filed these
! classes as SystemUser: the persistent env-1 GsMethodDictionary then lives in
! objectSecurityPolicyId 1, and an ordinary user gets SecurityError 2116 clearing
! it -- so install.sh would die on the first kernel-extension file.
!
! PERMITTED can hold while RESTRICTED fails, and that gap is the whole reason the
! flags are separate: it is exactly the state of an extent that was set up the
! shared way and is now running a checkout that wants the per-user way.  Reporting
! it keeps such an extent on the working shared path instead of producing a broken
! install, while still letting install_base.sh see that the base itself is fine and
! clear the blocker (it removes the shared env-1 methods so the per-user layer can
! take over).  On a fresh extent both are `yes' from the start.
!
! The second condition is probed by attempting the removal and ABORTING, so the
! probe never changes anything.
!
! BEHAVIOURAL, not version- or source-based, and deliberately so: it asks the
! kernel the same question install-time compilation will ask, so a rebuilt base
! image that answers correctly is detected automatically and Grail's interim patch
! stops being applied with no further change here.
!
! Logs in as the ordinary ./.topazini user -- it MUST NOT be SystemUser.  The
! predicate's final term is `(aBehavior canWriteMethodsEnv: envId) not', so
! SystemUser (who CAN write those classes directly) answers false even on a
! correct build.  The question is what a NON-privileged installer may do.
!
! Prints nothing if login itself fails (stone down / bad credentials); callers
! must treat a missing line as "no" and let the real install surface the error.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
| policy classes verdict permittedAll |
policy := GsPackagePolicy current.
(GsPackagePolicy canUnderstand: #'permitSessionMethodFor:selector:environmentId:')
	ifFalse: [
		"Pre-MR#6: no env-aware predicate at all, so env-1 routing is not
		 available for these classes however permissive the rest is."
		GsFile stdout
			nextPutAll: 'GRAIL_ENV1_PERMITTED=no'; lf;
			nextPutAll: 'GRAIL_ENV1_RESTRICTED=no'; lf; flush.
		^ true].
"All four files install.sh would file per-user, not just the restricted three:
 ExecBlock is unrestricted and so always passes condition 1, but it is just as
 subject to condition 2."
"All four files install.sh would file per-user, not just the restricted three:
 ExecBlock is unrestricted and so always passes condition 1, but it is just as
 subject to condition 2."
classes := #( #GsNMethod #System #SymbolDictionary #ExecBlock ).
permittedAll := true.
verdict := true.
classes do: [:eachName |
	| cls permitted clearable |
	cls := System myUserProfile symbolList objectNamed: eachName.
	permitted := cls isNil
		ifTrue: [false]
		ifFalse: [
			"A selector that cannot already exist, so the _isProtected branch is
			 not what is being measured."
			[policy
				permitSessionMethodFor: cls
				selector: #'___grailEnv1RestrictedProbe___'
				environmentId: 1]
				on: Error do: [:e | false]].
	"Condition 2: can this user actually clear the class's env-1 methods, as the
	 first statement of each kernel-extension file does?  Aborted below."
	clearable := (permitted == true and: [cls notNil])
		and: [[cls removeAllMethods: 1. true] on: Error do: [:e | false]].
	permitted == true ifFalse: [permittedAll := false].
	(permitted == true and: [clearable == true]) ifFalse: [verdict := false]].
"Discard the probe removals -- nothing above is kept."
System abortTransaction.
GsFile stdout
	nextPutAll: (permittedAll ifTrue: ['GRAIL_ENV1_PERMITTED=yes'] ifFalse: ['GRAIL_ENV1_PERMITTED=no']); lf;
	nextPutAll: (verdict ifTrue: ['GRAIL_ENV1_RESTRICTED=yes'] ifFalse: ['GRAIL_ENV1_RESTRICTED=no']); lf;
	flush.
true
%

logout
