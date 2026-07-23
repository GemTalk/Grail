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
! On a LEGACY kernel a few of Grail's kernel extensions cannot be per-user
! GsPackagePolicy session methods, so they are filed once here -- persistent and
! SHARED by every user (identical for everyone, rarely changed):
!   * builtin_function_or_method.gs (GsNMethod), System.gs, SymbolDictionary.gs
!       -- GsNMethod / System / SymbolDictionary are GsPackagePolicy
!          restrictedClasses; pre-MR#6 env-1 session methods are not permitted on
!          them.
!   * ExecBlock.gs
!       -- reached here only on a legacy kernel.  (Its fixed-arity value-family
!          wrappers were removed from the source -- those selectors are VM-reserved
!          and the compiler auto-routes `aBlock @env1:value:...' to env-0 block
!          invocation with no wrapper, so they were redundant AND could never be
!          session methods (CompileError 1001).  The remaining methods ARE
!          session-method-eligible.)
!   * Object_perform_allocators.gs (env-0 ___new___ bridges)
!       -- env-0 `SomeClass ___new___: arg' construction bridges; on a pre-MR#6
!          selector-keyed store they collide with the env-1 ___new___:_: /
!          ___new___:_:_: convenience methods, so they are shared/persistent here.
!   * Object_perform_primitives.gs (env-0 <primitive:2027> performMethod: 2/3/4-arg)
!       -- a plain user lacks CompilePrimitives.
!
! On a MODERN kernel (native env-1 session methods on restricted classes + native
! performMethod: 2/3/4-arg + per-env storage) install_base.sh SKIPS this whole file
! (see its probe): builtin_function_or_method / System / SymbolDictionary /
! ExecBlock / Object_perform_allocators are then filed PER-USER as session methods
! by install.sh/install.gs, and the performMethod: primitives are kernel-native.
! Only Unicode comparison mode then remains as a SystemUser (extent-global) step.
!
! These files reference NO per-user Python globals at compile time: their targets
! are the kernel classes Object / GsNMethod (in Globals), and None / AttributeError
! / ExecBlockAttrs are resolved at run time through each caller's OWN symbol list
! (see each file's header).  So SystemUser compiles them with only Globals, and
! each user's runtime gets its own None / AttributeError -- the one shared copy is
! never bound to the install user's objects.
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
input src/smalltalk/Python/Object_perform_allocators.gs
input src/smalltalk/Python/Object_perform_primitives.gs

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
