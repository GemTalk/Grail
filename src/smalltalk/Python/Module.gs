category: 'Testing'
method: Module
includesEnv1Selector: aSymbol 
  "Returns true if the receiver understands a method with the given selector in env1
   and false if not."
  ^ self _includesSelector: aSymbol flags: 16r10001 "cache result, env 1"
%
