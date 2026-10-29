Extension { #name : 'fractions' }

{ #category : 'Grail-Type Accessors' }
fractions >> Fraction [
	"Return the Fraction type exposed by this module (the GemStone
	Fraction class, populated by `initialize`).

	What Python assigned to ``fractions.Fraction'' first: that lands under the
	attribute's NAME, while initialize keeps the class under #fractionClass,
	so the entry alone answered the class Python had replaced (issue #1953)."

	^ self ___dataGlobalAt___: #Fraction otherwise: [self @env0:at: #fractionClass]

]

{ #category : 'Grail-Initialization' }
fractions >> initialize [
	"Bind the Fraction attribute to GemStone's Fraction class. The
	`Fraction` accessor reads this slot."

	self @env0:at: #fractionClass put: Fraction

]
