import {FieldAccessorMode, JavaOptions} from '@omnigen/target-java';
import {PrimitiveGenerificationChoice} from '@omnigen/core';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';

test('lombok', async () => {

  const options: JavaOptions = {
    ...DEFAULT_TEST_JAVA_OPTIONS,
    onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
    compressSoloReferencedTypes: false,
    compressUnreferencedSubTypes: false,
    generifyTypes: false,
    elevateProperties: false,
    fieldAccessorMode: FieldAccessorMode.LOMBOK,
  };

  const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', options);

  const inClass = JavaTestUtils.getParsedContent(fileContents, 'In.java');
  expect(inClass.foundImports).toEqual([
    'com.fasterxml.jackson.annotation.JsonProperty',
    'javax.annotation.Generated',
    'lombok.AllArgsConstructor',
    'lombok.Default',
    'lombok.EqualsAndHashCode',
    'lombok.experimental.NonFinal',
    'lombok.experimental.SuperBuilder',
    'lombok.extern.jackson.Jacksonized',
    'lombok.NoArgsConstructor',
    'lombok.RequiredArgsConstructor',
    'lombok.Value',
    'lombok.With',
  ]);
  expect(inClass.foundAnnotations).toEqual([
    'Generated',
    'Value',
    'With',
    'AllArgsConstructor',
    'RequiredArgsConstructor',
    'NoArgsConstructor',
    'NonFinal',
    'SuperBuilder',
    'Jacksonized',
    'EqualsAndHashCode',
    'JsonProperty',
    'Default',
  ]);

  expect(inClass.foundFields).toEqual(['inType']);
  expect(inClass.foundTypes).toEqual(['String']);
});
