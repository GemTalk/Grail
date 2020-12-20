! ------------------- Remove existing behavior from DictTestCase
expectvalue /Metaclass3       
doit
DictTestCase removeAllMethods.
DictTestCase class removeAllMethods.
%
! ------------------- Class methods for DictTestCase
! ------------------- Instance methods for DictTestCase
set compile_env: 0
category: 'other'
method: DictTestCase
astForPath: pathString

	| string file |
	file := GsFile open: pathString mode: 'rb' onClient: false.
	string := file contentsAsUtf8 decodeToUnicode.
	^ string
%
category: 'other'
method: DictTestCase
operationBlock

	^ [
		| lines l h m |
		lines := stdin.
		h := KeyValueDictionary new.
		m := 0.
		l := self readLine: lines.
		[ 
			(h includesKey: l) 
				ifTrue: [ h at: l put: (h at: l) + 1 ] 
				ifFalse: [ h at: l put: 1 ].
			(m < (h at: l))
				ifTrue: [ m := h at: l ].
			lines atEnd.
		] whileFalse: [
			l := self readLine: lines.
		].
	]
%
category: 'other'
method: DictTestCase
pathToTest

	^ '$HOME/code/Python/gemstonep/python_benchmarks/test.txt'
%
category: 'other'
method: DictTestCase
readLine: aStream

	^  (aStream upTo: (Character codePoint: 10)) asInteger. "\n"
%
category: 'other'
method: DictTestCase
setUp

	super setUp.
	stdin := ReadStream on: (self astForPath: self pathToTest).
%
category: 'other'
method: DictTestCase
testDict

	^ self operationBlock value
%
category: 'other'
method: DictTestCase
testDictCpuClock

	| time |
	time := System millisecondsToRun: self operationBlock.	
	Transcript show: 'DICT CPU CLOCK: ', time asString; cr.
%
category: 'other'
method: DictTestCase
testDictWallClock

	| time |
	time := Time millisecondsElapsedTime: self operationBlock.	
	Transcript show: 'DICT WALL CLOCK: ', time asString; cr.
%
