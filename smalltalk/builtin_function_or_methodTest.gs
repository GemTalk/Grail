! ------------------- Remove existing behavior from builtin_function_or_methodTest
removeAllMethods builtin_function_or_methodTest
removeAllClassMethods builtin_function_or_methodTest
! ------------------- Class methods for builtin_function_or_methodTest
! ------------------- Instance methods for builtin_function_or_methodTest
set compile_env: 0
category: 'other'
method: builtin_function_or_methodTest
testAbs

	| absHolder variables |
	variables := Variables new.
	absHolder := ((variables at:#abs) scope: variables
						  positional: { int ___value: 5.}
						  named: {}).
	self assert: (absHolder ___value) equals: (5).

	absHolder := ((variables at:#abs) scope: variables
						  positional: { int ___value: -5.}
						  named: {}).
	self assert: (absHolder ___value) equals: (5).

	absHolder := [((variables at:#abs) scope: variables
						  positional: { str ___value: 'a'.}
						  named: {})] on: TypeError do: [1].
	self assert: (absHolder) equals: (1).

	absHolder := [((variables at:#abs) scope: variables
						  positional: { int ___value: 1.  int ___value: 2.}
						  named: {})] on: TypeError do: [2].
	self assert: (absHolder) equals: (2).
%
category: 'other'
method: builtin_function_or_methodTest
testLen

	| listHolder variables alist|
	variables := Variables new.
	alist := list ___value: { 'c'. 'b'. 'a' }.
	listHolder := ((variables at:#len) scope: variables
						  positional: { alist.}
						  named: {}).
	self assert: (listHolder ___value) equals: (3).

	alist := int ___value: 1.
	listHolder := [((variables at:#len) scope: variables
						  positional: { alist.}
						  named: {})] on: TypeError do: [-1].
	self assert: (listHolder) equals: (-1).
%
category: 'other'
method: builtin_function_or_methodTest
testPrint

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
testRange

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
category: 'other'
method: builtin_function_or_methodTest
testType

	| typeHolder variables|
	variables := Variables new.
	
	typeHolder := ((variables at:#type) scope: variables
						  positional: { int ___value: 5.}
						  named: {}).
	self assert: (typeHolder) equals: (int).

	typeHolder := ((variables at:#type) scope: variables
						  positional: { (variables at:#type)}
						  named: {}).
	self assert: (typeHolder) equals: (FunctionDef).

	typeHolder := [((variables at:#type) scope: variables
						  positional: { int ___value: 5. tuple ___value: #(h)}
						  named: {})] on: TypeError do: [1].
	self assert: (typeHolder) equals: (1).
%
