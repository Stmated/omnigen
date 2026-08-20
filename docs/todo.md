
# TODO

* Need to separate the distinction betweeen "common type" and "encompassing type"
  * "common type" is something that both could truly be represented as ("hi"+"hello" => string)
  * "encompassing type" is something that can describe/fit both ("hi"+"hello" => ("hi" | "hello"))
  * Disctintion is crucial for getting a more accurate vocab and purpose/goal of certain functions 

* Move some of the literal union creation into getCommonDenominatorBetweenPrimitivesWithDifferentLiteralValues
  * Remove handling inside ElevatePropertiesModelTransformer and/or GenericsModelTransformer
  * This might (should?) require the "common type" vs "encompassing type" distinction to not make things weird

* There needs to be more clear ways of sorting the fields, constructor parameters and constructor body statements so that they are reliably same
