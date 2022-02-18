! ------------------- Remove existing behavior from builtin_function_or_methodTest
removeAllMethods builtin_function_or_methodTest
removeAllClassMethods builtin_function_or_methodTest
! ------------------- Class methods for builtin_function_or_methodTest
! ------------------- Instance methods for builtin_function_or_methodTest
set compile_env: 0
category: 'other'
method: builtin_function_or_methodTest
testprint

	| stream |

	stream := WriteStream with: String new.
	
	builtin_function_or_method new print: { str ___value: 'abc'. } _: (Dictionary new at: #'file' put: stream; yourself).
	self assert: stream contents equals: 'abc
'.

	stream reset.
	builtin_function_or_method new print: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' } _: (Dictionary new at: #'file' put: stream; yourself).
	self assert: stream contents equals: 'a b c
'.
	stream reset.
	builtin_function_or_method new print: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' } _: (Dictionary new at: #'end' put: (str ___value: ''); at: #'file' put: stream; yourself).
	self assert: stream contents equals: 'a b c'.

	stream reset.
	builtin_function_or_method new print: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' } _: (Dictionary new at: #'sep' put: (str ___value: '*'); at: #'file' put: stream; yourself).
	self assert: stream contents equals: 'a*b*c
'.

	stream reset.
	self 
		should: [ 
			builtin_function_or_method new print: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' } _: (Dictionary new at: #'end' put: False; at: #'file' put: stream; yourself)
		] raise: TypeError withExceptionDo: [ :ex | self assert: ex messageText equals: 'end must be None or a string, not bool' ].

	stream reset.
	self 
		should: [ 
			builtin_function_or_method new print: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' } _: (Dictionary new at: #'sep' put: False; at: #'file' put: stream; yourself)
		] raise: TypeError withExceptionDo: [ :ex | self assert: ex messageText equals: 'sep must be None or a string, not bool' ].
%
