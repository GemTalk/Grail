! ===============================================================================
! builtin_function_or_method Methods (Python 'builtin_function_or_method' type)
! ===============================================================================
! This file contains Python method implementations for GsNMethod.
! builtin_function_or_method is mapped to GsNMethod in the Python dictionary.
! These methods provide Python semantics for GemStone methods.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from builtin_function_or_method
expectvalue /Metaclass3
doit
builtin_function_or_method removeAllMethods: 2.
builtin_function_or_method class removeAllMethods: 2.
%

! ------------------- Instance methods for builtin_function_or_method
set compile_env: 2

category: 'Python-Type'
method: builtin_function_or_method
__class__
	"Return the Python type for builtin_function_or_method"
	^ builtin_function_or_method
%

category: 'Python-Attributes'
method: builtin_function_or_method
__name__
	"Return the name of the function/method"

	selector ifNil: [^ '<anonymous>'].
	^ selector ___asString___
%

category: 'Python-Attributes'
method: builtin_function_or_method
__qualname__
	"Return the qualified name of the function/method"

	| className selectorStr result |
	selector ifNil: [^ '<anonymous>'].

	inClass ifNil: [
		^ selector ___asString___
	].

	className := inClass ___name___.
	selectorStr := selector ___asString___.
	result := (className ___asString___) ___concat___: '.'.
	result := result ___concat___: selectorStr.
	^ result
%

category: 'Python-Attributes'
method: builtin_function_or_method
__module__
	"Return the module name (for now, return 'builtins')"
	^ 'builtins'
%

category: 'Python-Attributes'
method: builtin_function_or_method
__self__
	"Return the object the method is bound to"
	"For builtin_function_or_method, we don't track bound objects, so raise AttributeError"
	AttributeError ___signal___: '__self__'
%

category: 'Python-Attributes'
method: builtin_function_or_method
__text_signature__
	"Return the text signature (for now, return None)"
	^ nil
%

category: 'Python-Callable'
method: builtin_function_or_method
__call__: args
	"Call the method with the given arguments"
	"Note: For now, this is a simple implementation"
	"In the future, we may need to handle bound methods differently"
	^ self perform: #valueWithArguments: env: 0 withArguments: {args}
%

category: 'Python-String Representation'
method: builtin_function_or_method
__repr__
	"Return a string representation of the function/method"

	| name result |
	name := self __name__.
	result := '<built-in function ' ___concat___: name.
	result := result ___concat___: '>'.
	^ result
%

set compile_env: 0

