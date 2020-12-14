! ------------------- Remove existing behavior from set
expectvalue /Metaclass3       
doit
set removeAllMethods.
set class removeAllMethods.
%
! ------------------- Class methods for set
! ------------------- Instance methods for set
set compile_env: 0
category: 'other'
method: set
___initialize: aCollection

	super ___initialize: aCollection.
	attributes at: #'add' 		put: [ :arguments :keywords :scope | self __add__ value: arguments first ].
	attributes at: #'remove' 	put: [ :arguments :keywords :scope | self __remove__ value: arguments first ].
%
category: 'other'
method: set
__add__

	^ [ :elem | container add: elem ]
%
category: 'other'
method: set
__remove__

	^ [ :elem | 
		(container includes: elem)
			ifTrue: [ container remove: elem ]
			ifFalse: [ KeyError signal: elem ].
	]
%
