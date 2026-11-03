Extension { #name : 'PySysFlags' }

{ #category : 'Instance Creation' }
PySysFlags class >> ___refuseInstances___ [
	"CPython builds the one instance itself and refuses any other."

	^ TypeError ___signal___: 'cannot create ''sys.flags'' instances'

]

{ #category : 'Instance Creation' }
PySysFlags class >> __new__ [
	^ self ___refuseInstances___

]

{ #category : 'Instance Creation' }
PySysFlags class >> __new__: anObject [
	^ self ___refuseInstances___

]

{ #category : 'Instance Creation' }
PySysFlags class >> __new__: anObject _: another [
	^ self ___refuseInstances___

]

{ #category : 'Instance Creation' }
PySysFlags class >> _new: positional kw: keywords [
	^ self ___refuseInstances___

]
