Extension { #name : '_random' }

{ #category : 'Grail-Initialization' }
_random >> initialize [
	self @env0:at: #Random put: PyMersenneTwister

]
