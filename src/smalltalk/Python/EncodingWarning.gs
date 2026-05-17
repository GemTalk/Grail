! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- EncodingWarning
expectvalue /Class
doit
Warning subclass: 'EncodingWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
EncodingWarning category: 'Grail-Exceptions'
%
