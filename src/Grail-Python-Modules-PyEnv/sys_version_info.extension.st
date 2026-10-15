Extension { #name : 'sys_version_info' }

{ #category : 'Instance Creation' }
sys_version_info class >> ___refuseInstances___ [
	"CPython builds the one instance itself and refuses any other."

	^ TypeError ___signal___: 'cannot create ''sys.version_info'' instances'

]

{ #category : 'Instance Creation' }
sys_version_info class >> __new__ [
	^ self ___refuseInstances___

]

{ #category : 'Instance Creation' }
sys_version_info class >> __new__: anObject [
	^ self ___refuseInstances___

]

{ #category : 'Instance Creation' }
sys_version_info class >> __new__: anObject _: another [
	^ self ___refuseInstances___

]

{ #category : 'Grail-Attributes' }
sys_version_info >> ___pyAttrStore___: aName put: aValue [
	"The fields are read-only, as a struct sequence's members are; anything
	else is refused the way a tuple refuses it."

	(#('major' 'minor' 'micro' 'releaselevel' 'serial') @env0:includes: aName @env0:asString)
		ifTrue: [^ AttributeError ___signal___: 'readonly attribute'].
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Conversion' }
sys_version_info >> __repr__ [
	^ 'sys.version_info(major=' @env0:, (self @env0:at: 1) @env0:printString
		@env0:, ', minor=' @env0:, (self @env0:at: 2) @env0:printString
		@env0:, ', micro=' @env0:, (self @env0:at: 3) @env0:printString
		@env0:, ', releaselevel=' @env0:, (builtins @env1:instance @env1:repr: (self @env0:at: 4)) @env0:asString
		@env0:, ', serial=' @env0:, (self @env0:at: 5) @env0:printString
		@env0:, ')'

]

{ #category : 'Grail-Accessors' }
sys_version_info >> major [
	^ self @env0:at: 1

]

{ #category : 'Grail-Accessors' }
sys_version_info >> micro [
	^ self @env0:at: 3

]

{ #category : 'Grail-Accessors' }
sys_version_info >> minor [
	^ self @env0:at: 2

]

{ #category : 'Grail-Accessors' }
sys_version_info >> n_fields [
	^ 5

]

{ #category : 'Grail-Accessors' }
sys_version_info >> n_sequence_fields [
	^ 5

]

{ #category : 'Grail-Accessors' }
sys_version_info >> n_unnamed_fields [
	^ 0

]

{ #category : 'Grail-Accessors' }
sys_version_info >> releaselevel [
	^ self @env0:at: 4

]

{ #category : 'Grail-Accessors' }
sys_version_info >> serial [
	^ self @env0:at: 5

]
