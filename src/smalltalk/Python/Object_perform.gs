! ===============================================================================
! Object performMethod: variants (env-0 super-send dispatch, primitive 2027)
! ===============================================================================
! GemStone ships performMethod: (0-arg) and with:performMethod: (1-arg) on
! Object env-0.  Both invoke primitive 2027, which dispatches by inspecting the
! supplied selector's arity.  These 2- through 4-arg variants let
! Super >> doesNotUnderstand:args:envId: invoke a parent class's compiled method
! on the substituted receiver without going through the receiver's class
! dispatch (which would re-fire the same override).
!
! They carry a <primitive:> and there is no native N-arg performMethod: to
! delegate to (GemStone ships only 0/1-arg), so they must be compiled by
! SystemUser (DataCurator lacks CompilePrimitives).  Filed in via install.gs's
! restricted/primitive SystemUser section, persistent + shared -- they are
! env-0 dispatch infrastructure, identical for every user and rarely modified.
! (They previously lived at the top of Object.gs.)
! ===============================================================================

set compile_env: 0

! ------- env-0 ___new___ bridge allocators (moved from Object.gs) -------
! These bridge an env-0 class-side send to the env-1 __new__ allocator.  On
! 3.7.5 they must be persistent (SystemUser): ___new___:_: and ___new___:_:_:
! also exist in env 1 on Object class, and the simplified session-method store
! keys by selector only, so env-1 would clobber env-0.  (MR #6 on 4.0 stores
! per-environment and removes this constraint.)

category: 'Grail-Bridge'
classmethod: object
___new___: arg
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 2-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:performMethod:'
		args: { argOne. argTwo. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 3-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree with: argFour performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 4-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. argFour. aGsNMethod }
%
