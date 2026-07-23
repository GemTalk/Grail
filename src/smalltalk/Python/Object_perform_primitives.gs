! ===============================================================================
! Object performMethod: variants (env-0 super-send dispatch, primitive 2027)
! ===============================================================================
! GemStone ships performMethod: (0-arg) and with:performMethod: (1-arg) on Object
! env-0 (both invoke primitive 2027, which dispatches by the selector's arity).
! These 2- through 4-arg variants let Super >> doesNotUnderstand:args:envId:
! invoke a parent class's compiled method on the substituted receiver without
! going through the receiver's class dispatch (which would re-fire the override).
!
! They carry a <primitive:>, so compiling them requires the CompilePrimitives
! privilege, which an ordinary install user lacks -- hence they are filed once by
! SystemUser via install_base.gs (persistent + shared; env-0 dispatch
! infrastructure, identical for every user).
!
! On a MODERN kernel these 2/3/4-arg forms are provided NATIVELY by the base
! image (in category 'Message Handling', completing the native 0/1-arg family),
! so this file is NOT filed at all -- install_base.sh's capability probe skips
! the SystemUser base step entirely.  Grail needs only arities 0-4: >4-arg calls
! are dispatched through the 2-arg packed (positional-array, kwargs) varargs form.
!
! Target the kernel class `Object' directly (in Globals) so this file compiles
! without the per-user Python dictionary on the symbol list.
! ===============================================================================

set compile_env: 0

category: 'Grail-perform method'
method: Object
with: argOne with: argTwo performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 2-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:performMethod:'
		args: { argOne. argTwo. aGsNMethod }
%

category: 'Grail-perform method'
method: Object
with: argOne with: argTwo with: argThree performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 3-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. aGsNMethod }
%

category: 'Grail-perform method'
method: Object
with: argOne with: argTwo with: argThree with: argFour performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 4-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. argFour. aGsNMethod }
%
