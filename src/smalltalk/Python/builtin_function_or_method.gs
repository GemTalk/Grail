! ===============================================================================
! builtin_function_or_method Methods (Python 'builtin_function_or_method' type)
! ===============================================================================
! This file contains Python method implementations for GsNMethod.
! builtin_function_or_method is mapped to GsNMethod in the Python dictionary.
! These methods provide Python semantics for GemStone methods.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
!
! GsNMethod is one of GsPackagePolicy's restrictedClasses, so these env-1
! methods can't be per-user session methods; they are filed persistently as
! SystemUser (shared by every user).  Because the one shared copy must not bind
! to any single user's Python globals, the target is the kernel class GsNMethod
! (identical to the Python alias `builtin_function_or_method', and in Globals)
! and the per-user Python objects `None'/`AttributeError' are resolved at run
! time through the calling session's own symbol list (same idiom as
! Class.gs>>__base__), so each caller gets its OWN None/AttributeError.
! ===============================================================================

! ------------------- Remove existing Python methods from builtin_function_or_method
expectvalue /Metaclass3
doit
GsNMethod removeAllMethods: 1.
GsNMethod class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Callable'
method: GsNMethod
__call__: args
	"Call the method with the given arguments"
	"Note: For now, this is a simple implementation"
	"In the future, we may need to handle bound methods differently"
	^ self @env0:valueWithArguments: args
%

category: 'Grail-Type'
method: GsNMethod
__class__
	"Return the Python type for builtin_function_or_method (== GsNMethod)"
	^ GsNMethod
%

category: 'Grail-Attributes'
method: GsNMethod
__module__
	"Return the module name (for now, return 'builtins')"
	^ 'builtins'
%

category: 'Grail-Attributes'
method: GsNMethod
__name__
	"Return the name of the function/method"

	selector ifNil: [^ '<anonymous>'].
	^ selector @env0:asString
%

category: 'Grail-Attributes'
method: GsNMethod
__qualname__
	"Return the qualified name of the function/method"

	| className selectorStr result |
	selector ifNil: [^ '<anonymous>'].

	inClass ifNil: [
		^ selector @env0:asString
	].

	className := inClass @env0:name.
	selectorStr := selector @env0:asString.
	result := (className @env0:asString) @env0:, '.'.
	result := result @env0:, selectorStr.
	^ result
%

category: 'Grail-String Representation'
method: GsNMethod
__repr__
	"Return a string representation of the function/method"

	| name result |
	name := self __name__.
	result := '<built-in function ' @env0:, name.
	result := result @env0:, '>'.
	^ result
%

category: 'Grail-Attributes'
method: GsNMethod
__self__
	"Return the object the method is bound to"
	"For builtin_function_or_method, we don't track bound objects, so raise AttributeError.
	 Resolve AttributeError from the calling session's symbol list (this shared method
	 must not bind to the install user's copy)."
	(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError')
		___signal___: '__self__'
%

category: 'Grail-Attributes'
method: GsNMethod
__text_signature__
	"Return the text signature (for now, return None).  Resolve None from the
	 calling session's symbol list -- see the file header."
	^ System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'None'
%

set compile_env: 0
