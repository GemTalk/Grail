! ===============================================================================
! Grail base setup: shared restricted-class methods (run ONCE per extent)
! ===============================================================================
! Run ONCE per extent, as SystemUser, before any user runs ./install.sh -- most
! easily via the wrapper (which also does the 3.7.x GsPackagePolicy patch and
! Unicode mode):
!
!     ./install_base.sh
!
! or directly:
!
!     topaz -lq -S scripts/install_base.gs
!
! A few of Grail's env-1 kernel extensions cannot be per-user GsPackagePolicy
! session methods, so they are filed once here -- persistent and SHARED by every
! user (identical for everyone, rarely changed):
!   * builtin_function_or_method.gs (GsNMethod), System.gs, SymbolDictionary.gs
!       -- GsNMethod / System / SymbolDictionary are GsPackagePolicy
!          restrictedClasses; env-1 session methods are not permitted on them.
!   * ExecBlock.gs
!       -- ExecBlock's value-family selectors are VM-special (compiling them as
!          session methods raises CompileError 1001).
!   * Object_perform.gs
!       -- env-0 <primitive:> performMethod: variants + the env-0 ___new___
!          allocators (a plain user lacks CompilePrimitives; the allocators would
!          also collide with their env-1 namesakes in the selector-keyed 3.7.5
!          session store).
!
! These files reference NO per-user Python globals at compile time: their targets
! are the kernel classes Object / GsNMethod (in Globals), and None / AttributeError
! / ExecBlockAttrs are resolved at run time through each caller's OWN symbol list
! (see each file's header).  So SystemUser compiles them with only Globals, and
! each user's runtime gets its own None / AttributeError -- the one shared copy is
! never bound to the install user's objects.
!
! Once committed, every per-user ./install.sh runs with NO SystemUser step: the
! two env-1 blocks it executes (module singleton instantiation) simply dispatch to
! these already-committed shared methods.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

fileformat utf8

input src/smalltalk/Python/builtin_function_or_method.gs
input src/smalltalk/Python/System.gs
input src/smalltalk/Python/SymbolDictionary.gs
input src/smalltalk/Python/ExecBlock.gs
input src/smalltalk/Python/Object_perform.gs

run
System commitTransaction.
GsFile stdout
	nextPutAll: '==============================================='; lf;
	nextPutAll: ' install_base: restricted-class methods filed'; lf;
	nextPutAll: ' as SystemUser (shared; no Python-dict dependency)'; lf;
	nextPutAll: '==============================================='; lf;
	flush.
%

logout
