! ------------------- Remove existing behavior from builtin_function_or_methodTest
removeAllMethods builtin_function_or_methodTest
removeAllClassMethods builtin_function_or_methodTest
! ------------------- Class methods for builtin_function_or_methodTest
! ------------------- Instance methods for builtin_function_or_methodTest
set compile_env: 0
category: 'other'
method: builtin_function_or_methodTest
testprint

	| stream variables|
	variables := Variables new.
	stream := WriteStream with: String new.
	
	(variables at:#print) scope: variables
						  positional: { str ___value: 'abc'.}
						  named: {#'file' -> stream}.
	self assert: stream contents equals: 'abc
'.

	stream := WriteStream with: String new.
	(variables at:#print) scope: variables
						  positional: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }
						  named: {#'file' -> stream}.
	self assert: stream contents equals: 'abc
'.

	stream := WriteStream with: String new.
	(variables at:#print) scope: variables
						  positional: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }
						  named: {#file -> stream. #end -> (str ___value: '')}.
	self assert: stream contents equals: 'abc'.

	stream := WriteStream with: String new.
	(variables at:#print) scope: variables
						  positional: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }
						  named: {#file -> stream. #sep -> (str ___value: '*')}.
	self assert: stream contents equals: 'a*b*c
'.

	stream := WriteStream with: String new.
	self 
		should: [ 
			(variables at:#print) scope: variables
						  positional: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }
						  named: {#file -> stream. #end -> False}.
		] raise: TypeError withExceptionDo: [ :ex | self assert: ex messageText equals: 'end must be a str, not bool' ].

	stream := WriteStream with: String new.
	self 
		should: [ 
			(variables at:#print) scope: variables
						  positional: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }
						  named: {#file -> stream. #sep -> False}.
		] raise: TypeError withExceptionDo: [ :ex | self assert: ex messageText equals: 'sep must be a str, not bool' ].
%
category: 'other'
method: builtin_function_or_methodTest
testrange

	| rangeHolder variables|
	variables := Variables new.
	
	rangeHolder := ((variables at:#range) scope: variables
						  positional: { int ___value: 5.}
						  named: {}).
	self assert: (rangeHolder ___value) equals: (Interval from: 0 to: 4).

	rangeHolder := ((variables at:#range) scope: variables
						  positional: { int ___value: 5. int ___value: 7.}
						  named: {}).
	self assert: (rangeHolder ___value) equals: (Interval from: 5 to: 6).

	rangeHolder := ((variables at:#range) scope: variables
						  positional: { int ___value: 5. int ___value: 10. int ___value: 2.}
						  named: {}).
	self assert: (rangeHolder ___value) equals: (Interval from: 5 to: 9 by: 2).
%
