Extension { #name : 'GrailReprLookupSignaller' }

{ #category : 'Grail-Test-Support' }
GrailReprLookupSignaller >> ___pyAttrLoad___: aName [
	^ signal @env0:value

]

{ #category : 'Grail-Test-Support' }
GrailReprLookupSignaller >> __repr__ [
	^ 'reached __repr__'

]
