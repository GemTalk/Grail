! ------------------- Remove existing behavior from Scripter
removeAllMethods Scripter
removeAllClassMethods Scripter
! ------------------- Class methods for Scripter
set compile_env: 0
category: 'scripting'
classmethod: Scripter
writeFor: aPyClass dirTestOn: methodList
	" builds test__dir for aPyClass considering methodList
			only inplemented methods get active assertions
	try me
		self writeFor: object dirTestOn:  #( 'issuperset', 'symmetric_difference', 'union')
	"

	| list |
	list := ( methodList asSet remove: #, ifAbsent:[]; yourself ) asSortedCollection.
	^ String streamContents: [ :source |
		source nextPutAll: 'test__dir__
	" please inspect
	self new writeDirTestOn: ';
		       nextPutAll: list asArray asString;
				 nextPutAll: '
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: ';
				 nextPutAll: list size printString;
				 nextPutAll: '.
"'.
		list do: [ :each |
			source nextPutAll: ( ( aPyClass ___dir includes: each )
											ifTrue: [ '   ' ]
	 										ifFalse: [ '   #pyTodo. "' ] );
			       nextPutAll: 'self assert: ( dir __contains__: #';
			       nextPutAll: each;
			       nextPutAll:  ' ).';
			       cr;
			       nextPutAll: ( ( aPyClass ___dir includes: each )
											ifTrue: [ '' ]
	 										ifFalse: [ '"' ] )
 		]
 	]
%
! ------------------- Instance methods for Scripter
