/**
 * Type definitions for CANIAS IAS Web Service
 * Generated from iasWebService.xml WSDL (Apache Axis 1.4)
 */

import type { Client } from 'soap';

// ============================================================================
// SOAP CLIENT INTERFACES
// ============================================================================

/**
 * Typed SOAP client for CANIAS IAS Web Service
 * Extends the base soap.Client with typed method signatures
 */
export interface ICANIASClient extends Client {
	loginAsync(
		params: ILoginRequest,
	): Promise<[ILoginResponse, string, Record<string, any>]>;

	listIASServicesAsync(
		params: IListIASServicesRequest,
	): Promise<[IListIASServicesResponse, string, Record<string, any>]>;

	callIASServiceAsync(
		params: ICallIASServiceRequest,
	): Promise<[ICallIASServiceResponse, string, Record<string, any>]>;

	logoutAsync(
		params: ILogoutRequest,
	): Promise<[ILogoutResponse, string, Record<string, any>]>;
}

// ============================================================================
// REQUEST INTERFACES (from WSDL messages)
// ============================================================================

/**
 * Login request parameters
 * WSDL: loginRequest message
 */
export interface ILoginRequest {
	p_strClient: string;
	p_strLanguage: string;
	p_strDBName: string;
	p_strDBServer: string;
	p_strAppServer: string;
	p_strUserName: string;
	p_strPassword: string;
}

/**
 * List IAS Services request parameters
 * WSDL: listIASServicesRequest message
 */
export interface IListIASServicesRequest {
	p_strSessionId: string;
}

/**
 * Call IAS Service request parameters
 * WSDL: callIASServiceRequest message
 */
export interface ICallIASServiceRequest {
	sessionid: string;
	serviceid: string;
	args: string;
	returntype: string;
	permanent: boolean;
}

/**
 * Logout request parameters
 * WSDL: logoutRequest message
 */
export interface ILogoutRequest {
	p_strSessionId: string;
}

// ============================================================================
// RESPONSE INTERFACES (from WSDL messages)
// ============================================================================

/**
 * Login response (Axis 1.4 rpc/encoded format)
 * WSDL: loginResponse message - returns string session ID
 */
export interface ILoginResponse {
	loginReturn?: string;
}

/**
 * List IAS Services response (Axis 1.4 rpc/encoded format)
 * WSDL: listIASServicesResponse message - returns ArrayOf_xsd_string
 */
export interface IListIASServicesResponse {
	listIASServicesReturn?: string[] | string;
}

/**
 * Call IAS Service response (Axis 1.4 rpc/encoded format)
 * WSDL: callIASServiceResponse message - returns xsd:anyType
 */
export interface ICallIASServiceResponse {
	callIASServiceReturn?: any;
}

/**
 * Logout response (Axis 1.4 rpc/encoded format)
 * WSDL: logoutResponse message - empty response
 */
export interface ILogoutResponse {
	// Empty response as per WSDL
}

// ============================================================================
// PARSED RESPONSE INTERFACES (for node output)
// ============================================================================

/**
 * Parsed login result for node output
 */
export interface IParsedLoginResult {
	sessionId: string;
}

/**
 * Parsed list services result for node output
 */
export interface IParsedListServicesResult {
	services: string[] | string;
}

/**
 * Parsed logout result for node output
 */
export interface IParsedLogoutResult {
	success: boolean;
	response: any;
}

// ============================================================================
// SOAP FAULT INTERFACES
// ============================================================================

/**
 * SOAP Fault structure (SOAP 1.1 format)
 * Used for detailed error handling
 */
export interface ISOAPFault {
	faultcode: string;
	faultstring: string;
	faultactor?: string;
	detail?: any;
}

/**
 * SOAP Envelope structure for fault extraction
 */
export interface ISOAPEnvelope {
	Envelope?: {
		Body?: {
			Fault?: ISOAPFault;
		};
	};
}

/**
 * Extended Error type with SOAP fault information
 */
export interface ISOAPError extends Error {
	root?: ISOAPEnvelope;
	response?: any;
	body?: string;
	statusCode?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Full response structure when returnFull is enabled
 */
export interface IFullResponse<T> {
	result: T;
	rawResponse: string;
	soapHeaders: Record<string, any>;
}

/**
 * Args mode for callIASService operation
 */
export type CallArgsMode = 'rawString' | 'jsonString';

/**
 * Operation types
 */
export type OperationType = 'login' | 'listIASServices' | 'callIASService' | 'logout';
