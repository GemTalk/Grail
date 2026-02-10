! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst
set compile_env: 0
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
category: 'other'
method: DictAst
printSmalltalkOn: aStream

	keys isEmpty ifTrue: [
		aStream nextPutAll: '(KeyValueDictionary perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '([:___d | '.
	1 to: keys size do: [:i |
		aStream nextPutAll: '___d __setitem__: '.
		(keys at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ' _: '.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___d] value: (KeyValueDictionary perform: #new env: 0))'.
%
