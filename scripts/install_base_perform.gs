! ===============================================================================
! Shared base, REDUCED: only Object's env-0 dispatch infrastructure
! ===============================================================================
! Used instead of scripts/install_base.gs on a base where env-1 session methods
! reach restricted classes (scripts/detect_env1_restricted_classes.gs reports
! GRAIL_ENV1_RESTRICTED=yes -- natively, or after
! scripts/fix_env1_restricted_classes.gs).
!
! On such a base the four env-1 kernel-extension files move to the PER-USER layer
! (filed by install.sh via out/gen/kernel_class_extensions.gs):
!     builtin_function_or_method.gs   (GsNMethod)
!     System.gs
!     SymbolDictionary.gs
!     ExecBlock.gs
! so several users can install their own Grail on one stone without overwriting
! each other's copies.
!
! What CANNOT move, and is filed here:
!
!   * Object_perform_primitives.gs -- env-0 <primitive:2027> with:...performMethod:
!     for 2 / 3 / 4 arguments.  GemStone 4.0 ships arities 0 and 1 natively (both
!     in category 'Message Handling'); the wider ones are Grail's.  Compiling a
!     <primitive:> needs a privilege an ordinary user does not have, so no
!     permission change can move this file.  The wider arities are slated for the
!     next 4.0 build; once a build ships them natively, delete the file and this
!     entry (scripts/detect_modern_kernel.gs already probes for it, and answering
!     GRAIL_MODERN=yes then empties the shared base completely).
!
!   * Object_perform_allocators.gs -- env-0 ___new___ construction bridges.  These
!     collide with the env-1 ___new___:_: / ___new___:_:_: convenience methods on a
!     pre-MR#6 SELECTOR-keyed session-method store.  MR #6's per-environment
!     storage (GsPackagePolicy>>_sessionMethodEnvs) plausibly removes that
!     collision, which would let this file move per-user too -- but that is
!     UNTESTED, so it stays shared for now.  It is user-independent and rarely
!     edited, so leaving it shared costs little.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

! ------------------- Hand the four env-1 classes over to the per-user layer.
!
! An extent that was previously set up the SHARED way still holds SystemUser-owned
! persistent env-1 methods on these classes, in objectSecurityPolicyId 1.  That
! blocks the per-user layer outright: each kernel-extension file opens with
! `removeAllMethods: 1', and an ordinary user clearing a policy-1
! GsMethodDictionary gets SecurityError 2116 -- so install.sh would die on its
! first kernel-extension file.  (This is the failure mode CLAUDE.md records for
! mixing the monolithic and split installs.)
!
! Removing them here is what makes the handover possible.  It is deliberately
! DESTRUCTIVE of the shared copies: after this step no user has these methods
! until they run ./install.sh, which files them per-user.  Every user on the stone
! must therefore re-run ./install.sh -- coordinate before running install_base.sh.
!
! Idempotent: a no-op on a fresh extent, where there is nothing to remove.
run
| removed |
removed := 0.
#( #GsNMethod #System #SymbolDictionary #ExecBlock ) do: [:eachName |
	| cls |
	cls := Globals at: eachName otherwise: nil.
	cls ifNotNil: [
		((cls selectorsForEnvironment: 1) isEmpty
			and: [(cls class selectorsForEnvironment: 1) isEmpty])
			ifFalse: [
				cls removeAllMethods: 1.
				cls class removeAllMethods: 1.
				removed := removed + 1]]].
System commitTransaction.
GsFile stdout
	nextPutAll: '  shared env-1 methods cleared from ';
	nextPutAll: removed printString;
	nextPutAll: ' of 4 classes (0 = already per-user / fresh extent)'; lf; flush.
true
%

fileformat utf8

input src/smalltalk/Python/Object_perform_allocators.gs
input src/smalltalk/Python/Object_perform_primitives.gs

run
System commitTransaction.
GsFile stdout
	nextPutAll: '==============================================='; lf;
	nextPutAll: ' install_base (reduced): Object env-0 dispatch'; lf;
	nextPutAll: ' filed as SystemUser.  The four env-1 kernel'; lf;
	nextPutAll: ' extension files are PER-USER on this base.'; lf;
	nextPutAll: '==============================================='; lf;
	flush.
true
%

logout
