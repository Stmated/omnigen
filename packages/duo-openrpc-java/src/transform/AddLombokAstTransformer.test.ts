import {FieldAccessorMode} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS} from '@omnigen/core';
import {expect, test} from 'vitest';

test('lombok', async () => {

  const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
    modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false, elevateProperties: false},
    javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, fieldAccessorMode: FieldAccessorMode.LOMBOK},
    targetOptions: {
      ...DEFAULT_TEST_TARGET_OPTIONS,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
    },
  });

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
    'AllArgsConstructor',
    'EqualsAndHashCode',
    'NonFinal',
    'SuperBuilder',
    'Jacksonized',
    'NoArgsConstructor',
    'RequiredArgsConstructor',
    'Value',
    'With',
    'JsonProperty',
    'Default',
  ]);

  expect(inClass.foundFields).toEqual(['inType']);
  expect(inClass.foundTypes).toEqual(['String']);
});
