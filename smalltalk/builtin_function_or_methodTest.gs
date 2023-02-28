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
testBool

	| boolHolder variables |
	variables := Variables new.
	boolHolder := ((variables at:#bool) scope: variables
						  positional: { True.}
						  named: {}).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { False.}
						  named: {}).
	self assert: (boolHolder) equals: (False).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { int ___value: 2.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { int ___value: 0.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (False).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { float ___value: 3.1.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { float ___value: 0.0.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (False).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { str ___value: '4'.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { str ___value: ''.}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (False).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { (variables at:#bool)}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { list ___value: {int ___value: 1}}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (True).

	boolHolder := ((variables at:#bool) scope: variables
						  positional: { list ___value: {}}
						  named: {}).
	self assert: (boolHolder class) equals: (bool).
	self assert: (boolHolder) equals: (False).
%
category: 'other'
method: builtin_function_or_methodTest
testChr

	| chrHolder variables |
	variables := Variables new.
	chrHolder := ((variables at:#chr) scope: variables
						  positional: { int ___value: 97.}
						  named: {}).
	self assert: (chrHolder ___value) equals: ('a').

	chrHolder := [((variables at:#chr) scope: variables
						  positional: { float ___value: 4.1.}
						  named: {}).] on: TypeError do: [1].
	
	self assert: (chrHolder) equals: (1).
%
category: 'other'
method: builtin_function_or_methodTest
testDict
   | containerHolder variables|
	variables := Variables new.
	
	containerHolder := list ___value: {}.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {}.
	self assert: containerHolder equals: (dict ___value: {} asDictionary).

	containerHolder := dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {}.
	self assert: containerHolder equals: (dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary).

	containerHolder := list ___value: {tuple ___value: {str ___value: 'c'. int ___value: 3} asArray }.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {}.
	self assert: containerHolder equals: (dict ___value: {(str ___value: 'c') -> (int ___value: 3)} asDictionary).

	containerHolder := list ___value: {}.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {(str ___value: 'd') -> (int ___value: 7)}.
	self assert: containerHolder equals: (dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary).

	containerHolder := list ___value: {tuple ___value: {str ___value: 'c'. int ___value: 3} asArray }.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {(str ___value: 'd') -> (int ___value: 7)}.
	self assert: containerHolder equals: (dict ___value: {(str ___value: 'c') -> (int ___value: 3). (str ___value: 'd') -> (int ___value: 7)} asDictionary).
%
category: 'other'
method: builtin_function_or_methodTest
testFloat

	| floatHolder variables |
	variables := Variables new.
	floatHolder := ((variables at:#float) scope: variables
						  positional: { float ___value: 1.1.}
						  named: {}).
	self assert: (floatHolder ___value) equals: (1.1).

	floatHolder := ((variables at:#float) scope: variables
						  positional: { int ___value: 2.}
						  named: {}).
	self assert: (floatHolder class) equals: (float).
	self assert: (floatHolder ___value) equals: (2).

	floatHolder := ((variables at:#float) scope: variables
						  positional: { str ___value: '3.1'.}
						  named: {}).
	self assert: (floatHolder class) equals: (float).
	self assert: (floatHolder ___value) equals: (3.1).

	floatHolder := ((variables at:#float) scope: variables
						  positional: { str ___value: '4'.}
						  named: {}).
	self assert: (floatHolder class) equals: (float).
	self assert: (floatHolder ___value) equals: (4).

	floatHolder := [((variables at:#float) scope: variables
						  positional: { str ___value: 'a'}
						  named: {})] on: ValueError do: [2].
	self assert: (floatHolder) equals: (2).

	floatHolder := [((variables at:#float) scope: variables
						  positional: { list ___value: {int ___value: 1}}
						  named: {})] on: TypeError do: [3].
	self assert: (floatHolder) equals: (3).
%
category: 'other'
method: builtin_function_or_methodTest
testFrozenset

	| frozensetHolder variables afrozenset|
	variables := Variables new.
	afrozenset := frozenset ___value: { 'c'. 'b'. 'a'.}.
	frozensetHolder := ((variables at:#frozenset) scope: variables
						  positional: { afrozenset.}
						  named: {}).
	self assert: (frozensetHolder) equals: (afrozenset).

	frozensetHolder := ((variables at:#frozenset) scope: variables
						  positional: { str ___value: 'abca'.}
						  named: {}).
	self assert: (frozensetHolder) equals: (frozenset ___value: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }).

	frozensetHolder := ((variables at:#frozenset) scope: variables
						  positional: { list ___value: { 'c'. 'b'. 'a'. 'a' }}
						  named: {}).
	self assert: (frozensetHolder) equals: (afrozenset).

	frozensetHolder := ((variables at:#frozenset) scope: variables
						  positional: {dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary.}
						  named: {}).
	self assert: (frozensetHolder) equals: (frozenset ___value: {str ___value: 'd'}).
%
category: 'other'
method: builtin_function_or_methodTest
testInt

	| intHolder variables |
	variables := Variables new.
	intHolder := ((variables at:#int) scope: variables
						  positional: { int ___value: 3.}
						  named: {}).
	self assert: (intHolder ___value) equals: (3).

	intHolder := ((variables at:#int) scope: variables
						  positional: { float ___value: 4.1.}
						  named: {}).
	self assert: (intHolder class) equals: (int).
	self assert: (intHolder ___value) equals: (4).

	variables := Variables new.
	intHolder := ((variables at:#int) scope: variables
						  positional: { str ___value: '11'.}
						  named: {}).
	self assert: (intHolder ___value) equals: (11).

	variables := Variables new.
	intHolder := ((variables at:#int) scope: variables
						  positional: { str ___value: '-11'.}
						  named: {}).
	self assert: (intHolder ___value) equals: (-11).

	variables := Variables new.
	intHolder := ((variables at:#int) scope: variables
						  positional: { str ___value: '-11'. int ___value: 2}
						  named: {}).
	self assert: (intHolder ___value) equals: (-3).
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
testList
	| listHolder variables alist|
	variables := Variables new.
	alist := list ___value: { 'c'. 'b'. 'a' }.
	listHolder := ((variables at:#list) scope: variables
						  positional: { alist.}
						  named: {}).
	self assert: (listHolder) equals: (alist).

	listHolder := ((variables at:#list) scope: variables
						  positional: { str ___value: 'abc'.}
						  named: {}).
	self assert: (listHolder) equals: (list ___value: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }).

	listHolder := ((variables at:#list) scope: variables
						  positional: { set ___value: { 'c'. 'b'. 'a' }}
						  named: {}).
	self assert: (listHolder) equals: (alist).

	listHolder := ((variables at:#list) scope: variables
						  positional: {dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary.}
						  named: {}).
	self assert: (listHolder) equals: (list ___value: {str ___value: 'd'}).
%
category: 'other'
method: builtin_function_or_methodTest
testOrd

	| ordHolder variables |
	variables := Variables new.
	ordHolder := ((variables at:#ord) scope: variables
						  positional: { str ___value: 'a'.}
						  named: {}).
	self assert: (ordHolder ___value) equals: (97).

	ordHolder := [((variables at:#ord) scope: variables
						  positional: { str ___value: 'aa'.}
						  named: {})] on: TypeError do: [1].
	self assert: (ordHolder) equals: (1).

	ordHolder := [((variables at:#ord) scope: variables
						  positional: { int ___value: 1.}
						  named: {})] on: TypeError do: [2].
	self assert: (ordHolder) equals: (2).
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
testRepr

	| variables |
	variables := Variables new.
	
	self assert: (((variables at:#repr) scope: variables
						  positional: { int ___value: 3.}
						  named: {})) equals: (str ___value: '3').

	self assert: (((variables at:#repr) scope: variables
						  positional: { str ___value: 'a'.}
						  named: {})) equals: (str ___value: '''a''').
""
	self assert: (((variables at:#repr) scope: variables
						  positional: {list ___value: { str ___value: 'c'. str ___value: 'b'. str ___value:  'a' }}
						  named: {})) equals: (str ___value: '[''c'', ''b'', ''a'']').
%
category: 'other'
method: builtin_function_or_methodTest
testSet

	| setHolder variables aset|
	variables := Variables new.
	aset := set ___value: { 'c'. 'b'. 'a'.}.
	setHolder := ((variables at:#set) scope: variables
						  positional: { aset.}
						  named: {}).
	self assert: (setHolder) equals: (aset).

	setHolder := ((variables at:#set) scope: variables
						  positional: { str ___value: 'abca'.}
						  named: {}).
	self assert: (setHolder) equals: (set ___value: { str ___value: 'a'. str ___value: 'b'. str ___value: 'c' }).

	setHolder := ((variables at:#set) scope: variables
						  positional: { list ___value: { 'c'. 'b'. 'a'. 'a' }}
						  named: {}).
	self assert: (setHolder) equals: (aset).


	setHolder := ((variables at:#set) scope: variables
						  positional: {dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary.}
						  named: {}).
	self assert: (setHolder) equals: (set ___value: {str ___value: 'd'}).
%
category: 'other'
method: builtin_function_or_methodTest
testStr

	| variables |
	variables := Variables new.
	
	self assert: (((variables at:#str) scope: variables
						  positional: { int ___value: 3.}
						  named: {})) equals: (str ___value: '3').

	self assert: (((variables at:#str) scope: variables
						  positional: { str ___value: 'a'.}
						  named: {})) equals: (str ___value: 'a').
""
	self assert: (((variables at:#str) scope: variables
						  positional: {list ___value: { str ___value: 'c'. str ___value: 'b'. str ___value:  'a' }}
						  named: {})) equals: (str ___value: '[''c'', ''b'', ''a'']').
%
category: 'other'
method: builtin_function_or_methodTest
testSum
	| listHolder variables alist|
	variables := Variables new.
	alist := list ___value: { int ___value: 1. int ___value: 2. int ___value: 3 }.
	listHolder := ((variables at:#sum) scope: variables
						  positional: { alist.}
						  named: {}).
	self assert: (listHolder) equals: (int ___value: 6).

	alist := list ___value: { int ___value: 1. float ___value: 2. int ___value: 3 }.
	listHolder := ((variables at:#sum) scope: variables
						  positional: { alist.}
						  named: {}).
	self assert: (listHolder) equals: (float ___value: 6).

	alist := list ___value: { complex ___real: 1 imaginary: 1. float ___value: 2. int ___value: 3 }.
	listHolder := ((variables at:#sum) scope: variables
						  positional: { alist.}
						  named: {}).
	self assert: (listHolder) equals: (complex ___real: 6 imaginary: 1).

	alist := list ___value: { int ___value: 1. str ___value: 'a'. int ___value: 3 }.
	listHolder := [((variables at:#sum) scope: variables
						  positional: { alist.}
						  named: {}).] on: TypeError do: [1].
	self assert: (listHolder) equals: (1).

	alist := str ___value: '123'.
	listHolder := [((variables at:#sum) scope: variables
						  positional: { alist.}
						  named: {}).] on: TypeError do: [2].
	self assert: (listHolder) equals: (2).
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
category: 'other'
method: builtin_function_or_methodTest
testUpdate
   | containerHolder variables|
	variables := Variables new.
	
	containerHolder := list ___value: {}.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {}.
	self assert: containerHolder equals: (dict ___value: {} asDictionary).
	containerHolder := list ___value: {}.
	containerHolder := (variables at: #dict) scope: variables
								positional: {containerHolder}
								named: {(str ___value: 'd') -> (int ___value: 7)}.
	self assert: containerHolder equals: (dict ___value: {(str ___value: 'd') -> (int ___value: 7)} asDictionary).
%
