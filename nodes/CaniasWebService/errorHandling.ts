/**
 * Error handling utilities for CANIAS Web Service
 * Provides detailed SOAP fault parsing and user-friendly error messages
 */

import { NodeOperationError, type INode } from 'n8n-workflow';
import type { ISOAPError, ISOAPFault } from './types';

/**
 * Extract SOAP fault information from error
 */
export function extractSOAPFault(error: ISOAPError): ISOAPFault | null {
	// Check for SOAP 1.1 fault in root.Envelope.Body.Fault
	if (error.root?.Envelope?.Body?.Fault) {
		return error.root.Envelope.Body.Fault;
	}

	// Check for fault in response body
	if (error.body) {
		try {
			const bodyObj = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
			if (bodyObj?.Envelope?.Body?.Fault) {
				return bodyObj.Envelope.Body.Fault;
			}
		} catch {
			// Not JSON, might be XML - let it fall through
		}
	}

	return null;
}

/**
 * Create a user-friendly error message from SOAP fault
 */
export function formatSOAPFaultMessage(fault: ISOAPFault): string {
	const parts: string[] = ['SOAP Fault'];

	if (fault.faultcode) {
		parts.push(`[${fault.faultcode}]`);
	}

	if (fault.faultstring) {
		parts.push(fault.faultstring);
	}

	return parts.join(' ');
}

/**
 * Get detailed error description including fault details
 */
export function getErrorDescription(fault: ISOAPFault, error: ISOAPError): string | undefined {
	const details: string[] = [];

	if (fault.faultactor) {
		details.push(`Actor: ${fault.faultactor}`);
	}

	if (fault.detail) {
		try {
			const detailStr =
				typeof fault.detail === 'string' ? fault.detail : JSON.stringify(fault.detail, null, 2);
			details.push(`Detail: ${detailStr}`);
		} catch {
			details.push(`Detail: ${String(fault.detail)}`);
		}
	}

	if (error.statusCode) {
		details.push(`HTTP Status: ${error.statusCode}`);
	}

	return details.length > 0 ? details.join('\n') : undefined;
}

/**
 * Enhanced error handler for SOAP operations
 * Provides detailed error messages with SOAP fault information
 */
export function handleSOAPError(
	error: unknown,
	node: INode,
	itemIndex: number,
	operation: string,
): never {
	const soapError = error as ISOAPError;
	const fault = extractSOAPFault(soapError);

	if (fault) {
		// SOAP Fault detected - provide detailed information
		const message = formatSOAPFaultMessage(fault);
		const description = getErrorDescription(fault, soapError);

		throw new NodeOperationError(node, message, {
			itemIndex,
			description,
			message: `Failed to execute ${operation} operation: ${message}`,
		});
	}

	// Network or connection errors
	if (soapError.statusCode) {
		const statusMessages: Record<number, string> = {
			400: 'Bad Request - Invalid SOAP message',
			401: 'Unauthorized - Check credentials',
			403: 'Forbidden - Access denied',
			404: 'Not Found - WSDL endpoint not available',
			500: 'Internal Server Error - CANIAS server error',
			502: 'Bad Gateway - Cannot reach CANIAS server',
			503: 'Service Unavailable - CANIAS server is down',
			504: 'Gateway Timeout - CANIAS server not responding',
		};

		const statusMessage = statusMessages[soapError.statusCode] || 'HTTP Error';
		throw new NodeOperationError(
			node,
			`${statusMessage} (${soapError.statusCode})`,
			{
				itemIndex,
				description: soapError.message,
				message: `Failed to execute ${operation} operation: ${statusMessage}`,
			},
		);
	}

	// Timeout errors
	if (soapError.message?.includes('timeout') || soapError.message?.includes('ETIMEDOUT')) {
		throw new NodeOperationError(
			node,
			'Request timeout - CANIAS server did not respond in time',
			{
				itemIndex,
				description: 'Try increasing the timeout in Advanced settings or check server availability',
				message: `Failed to execute ${operation} operation: Timeout`,
			},
		);
	}

	// Connection errors
	if (
		soapError.message?.includes('ECONNREFUSED') ||
		soapError.message?.includes('ENOTFOUND') ||
		soapError.message?.includes('ECONNRESET')
	) {
		throw new NodeOperationError(
			node,
			'Cannot connect to CANIAS server',
			{
				itemIndex,
				description: 'Check WSDL URL in credentials and ensure CANIAS server is accessible',
				message: `Failed to execute ${operation} operation: Connection failed`,
			},
		);
	}

	// SSL/TLS errors
	if (
		soapError.message?.includes('CERT_') ||
		soapError.message?.includes('certificate') ||
		soapError.message?.includes('SSL')
	) {
		throw new NodeOperationError(
			node,
			'SSL/TLS certificate error',
			{
				itemIndex,
				description: 'Enable "Disable SSL Verification" in Advanced settings if using self-signed certificates',
				message: `Failed to execute ${operation} operation: Certificate error`,
			},
		);
	}

	// Generic error fallback
	const errorMessage = soapError.message || 'Unknown error occurred';
	throw new NodeOperationError(node, errorMessage, {
		itemIndex,
		message: `Failed to execute ${operation} operation: ${errorMessage}`,
	});
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: string): void {
	if (!sessionId || sessionId.trim() === '') {
		throw new Error('Session ID is required and cannot be empty');
	}

	// Basic validation - session IDs should be alphanumeric with possible dashes/underscores
	if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
		throw new Error(
			'Invalid session ID format. Session ID should contain only letters, numbers, dashes, and underscores',
		);
	}
}

/**
 * Validate service ID format
 */
export function validateServiceId(serviceId: string): void {
	if (!serviceId || serviceId.trim() === '') {
		throw new Error('Service ID is required and cannot be empty');
	}
}
