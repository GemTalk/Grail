Extension { #name : 'GsNMethod' }

{ #category : 'Grail-Callable' }
GsNMethod >> __call__: args [
	"Call the method with the given arguments"
	"Note: For now, this is a simple implementation"
	"In the future, we may need to handle bound methods differently"
	^ self @env0:valueWithArguments: args

]

{ #category : 'Grail-Type' }
GsNMethod >> __class__ [
	"Return the Python type for builtin_function_or_method (== GsNMethod)"
	^ GsNMethod

]

{ #category : 'Grail-Attributes' }
GsNMethod >> __module__ [
	"Return the module name (for now, return 'builtins')"
	^ 'builtins'

]

{ #category : 'Grail-Attributes' }
GsNMethod >> __name__ [
	"Return the name of the function/method"

	selector ifNil: [^ '<anonymous>'].
	^ selector @env0:asString

]

{ #category : 'Grail-Attributes' }
GsNMethod >> __qualname__ [
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

]

{ #category : 'Grail-String Representation' }
GsNMethod >> __repr__ [
	"Return a string representation of the function/method"

	| name result |
	name := self __name__.
	result := '<built-in function ' @env0:, name.
	result := result @env0:, '>'.
	^ result

]

{ #category : 'Grail-Attributes' }
GsNMethod >> __self__ [
	"Return the object the method is bound to"
	"For builtin_function_or_method, we don't track bound objects, so raise AttributeError.
	 Resolve AttributeError from the calling session's symbol list (this shared method
	 must not bind to the install user's copy)."
	(System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError')
		___signal___: '__self__'

]

{ #category : 'Grail-Attributes' }
GsNMethod >> __text_signature__ [
	"Return the text signature (for now, return None).  Resolve None from the
	 calling session's symbol list -- see the file header."
	^ System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'None'

]
